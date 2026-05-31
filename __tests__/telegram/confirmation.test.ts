import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ParsedTask } from "@/lib/telegram/parse-task";

// Track sendMessage calls
const mockSendMessage = vi.fn().mockResolvedValue({ ok: true });
vi.mock("@/lib/telegram/api", () => ({
  sendMessage: (...args: unknown[]) => mockSendMessage(...args),
}));

// Supabase mock
const mockInsertSelect = vi.fn();
const mockInsert = vi.fn(() => ({ select: mockInsertSelect }));
const mockDeleteEq = vi.fn().mockResolvedValue({ error: null });
const mockDelete = vi.fn(() => ({ eq: mockDeleteEq }));
const mockTaskInsertSelect = vi.fn();
const mockTaskInsert = vi.fn(() => ({ select: mockTaskInsertSelect }));
const mockAssigneeInsert = vi.fn().mockResolvedValue({ error: null });

let fromCallCount = 0;

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "telegram_pending_tasks") {
        return {
          insert: mockInsert,
          select: () => ({
            eq: () => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "pending-1",
                  parsed_data: FULL_TASK,
                },
                error: null,
              }),
            }),
          }),
          delete: mockDelete,
        };
      }
      if (table === "tasks") {
        return { insert: mockTaskInsert };
      }
      if (table === "task_assignees") {
        return { insert: mockAssigneeInsert };
      }
      return { insert: vi.fn(), select: vi.fn(), delete: vi.fn() };
    },
  }),
}));

import {
  buildConfirmationText,
  sendTaskConfirmation,
  confirmTask,
} from "@/lib/telegram/confirmation";

const FULL_TASK: ParsedTask = {
  client_name: "פוטוטבע | Phototeva",
  client_id: "c1-uuid",
  title: "לעדכן קריאייטיבים",
  description: "לעדכן קריאייטיבים לקמפיין חדש",
  assignee_name: "Idan Alush",
  assignee_id: "m1-uuid",
  creator_name: "Idan Alush",
  creator_id: "m1-uuid",
  due_date: "2026-05-25",
  priority: "normal",
  confidence: 0.9,
};

const NO_DATE_TASK: ParsedTask = {
  ...FULL_TASK,
  due_date: null,
};

const DIFFERENT_CREATOR_TASK: ParsedTask = {
  ...FULL_TASK,
  creator_name: "Idan Alush",
  creator_id: "m1-uuid",
  assignee_name: "Sharon Raz",
  assignee_id: "m2-uuid",
};

beforeEach(() => {
  vi.clearAllMocks();
  fromCallCount = 0;
});

describe("buildConfirmationText", () => {
  it("includes all fields in the message", () => {
    const text = buildConfirmationText(FULL_TASK);

    expect(text).toContain("פוטוטבע | Phototeva");
    expect(text).toContain("לעדכן קריאייטיבים");
    expect(text).toContain("Idan Alush");
    expect(text).toContain("2026-05-25");
  });

  it('shows "לא צוין" when due_date is null', () => {
    const text = buildConfirmationText(NO_DATE_TASK);

    expect(text).toContain("לא צוין");
    expect(text).not.toContain("null");
  });

  it("shows creator and assignee separately when they differ", () => {
    const text = buildConfirmationText(DIFFERENT_CREATOR_TASK);

    expect(text).toContain("פותח:");
    expect(text).toContain("Idan Alush");
    expect(text).toContain("מבצע:");
    expect(text).toContain("Sharon Raz");
    expect(text).not.toContain("אחראי:");
  });

  it('shows single "אחראי" when creator equals assignee', () => {
    const text = buildConfirmationText(FULL_TASK);

    expect(text).toContain("אחראי:");
    expect(text).not.toContain("פותח:");
    expect(text).not.toContain("מבצע:");
  });
});

describe("sendTaskConfirmation", () => {
  it("stores pending task and sends message with 3 button rows", async () => {
    mockInsertSelect.mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: { id: "pending-1" },
        error: null,
      }),
    });

    await sendTaskConfirmation(67890, 12345, FULL_TASK);

    // Should have called insert with the parsed data
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        chat_id: 67890,
        telegram_user_id: 12345,
        parsed_data: FULL_TASK,
      }),
    );

    // Should have sent a message with inline keyboard
    expect(mockSendMessage).toHaveBeenCalledWith(
      67890,
      expect.stringContaining("פוטוטבע"),
      expect.objectContaining({
        inline_keyboard: expect.arrayContaining([
          expect.arrayContaining([
            expect.objectContaining({ text: "✅ אשר" }),
            expect.objectContaining({ text: "✏️ ערוך" }),
          ]),
          expect.arrayContaining([
            expect.objectContaining({ text: "👥 שייך למישהו אחר" }),
          ]),
        ]),
      }),
    );
  });
});

describe("confirmTask", () => {
  it("creates task with source=telegram and assignee link", async () => {
    mockTaskInsertSelect.mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: { id: "task-1" },
        error: null,
      }),
    });

    const taskId = await confirmTask("pending-1");

    expect(taskId).toBe("task-1");

    // Task created with source='telegram' and created_by_id
    expect(mockTaskInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: FULL_TASK.title,
        client_id: FULL_TASK.client_id,
        source: "telegram",
        created_by_id: FULL_TASK.creator_id,
      }),
    );

    // Assignee linked
    expect(mockAssigneeInsert).toHaveBeenCalledWith({
      task_id: "task-1",
      member_id: FULL_TASK.assignee_id,
    });

    // Pending task cleaned up
    expect(mockDelete).toHaveBeenCalled();
  });
});
