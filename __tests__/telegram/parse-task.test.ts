import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase admin client
const mockSelect = vi.fn();
const mockOrder = vi.fn(() => ({ data: [], error: null }));
const mockEq = vi.fn(() => ({ order: mockOrder, data: [], error: null }));
const mockFrom = vi.fn(() => ({
  select: mockSelect,
}));

mockSelect.mockReturnValue({
  order: mockOrder,
  eq: mockEq,
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

// Mock Anthropic SDK
const mockCreate = vi.fn();
vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class {
      messages = { create: mockCreate };
    },
  };
});

import { parseTaskFromText } from "@/lib/telegram/parse-task";

const FAKE_CLIENTS = [
  { id: "c1-uuid", name: "פוטוטבע | Phototeva" },
  { id: "c2-uuid", name: "שנקר הנדסאים" },
  { id: "c3-uuid", name: "מילגה" },
];

const FAKE_MEMBERS = [
  { id: "m1-uuid", full_name: "Idan Alush" },
  { id: "m2-uuid", full_name: "Sharon Raz" },
];

const SENDER = { id: "m1-uuid", full_name: "Idan Alush" };

beforeEach(() => {
  vi.clearAllMocks();

  // Setup Supabase mock to return clients on first call, members on second
  let callCount = 0;
  mockFrom.mockImplementation((table: string) => {
    if (table === "clients") {
      return {
        select: () => ({
          order: () => ({ data: FAKE_CLIENTS, error: null }),
        }),
      };
    }
    if (table === "team_members") {
      return {
        select: () => ({
          eq: () => ({
            order: () => ({ data: FAKE_MEMBERS, error: null }),
          }),
        }),
      };
    }
    callCount++;
    return { select: mockSelect };
  });
});

describe("parseTaskFromText", () => {
  it("extracts client name and title from Hebrew text", async () => {
    const parsedResponse = {
      client_name: "פוטוטבע | Phototeva",
      client_id: "c1-uuid",
      title: "לעדכן קריאייטיבים",
      description: "לעדכן קריאייטיבים לקמפיין",
      assignee_name: "Idan Alush",
      assignee_id: "m1-uuid",
      creator_name: "Idan Alush",
      creator_id: "m1-uuid",
      due_date: null,
      priority: "normal",
      confidence: 0.9,
    };

    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(parsedResponse) }],
    });

    const result = await parseTaskFromText(
      "פוטוטבע - לעדכן קריאייטיבים לקמפיין",
      SENDER,
    );

    expect(result.client_name).toBe("פוטוטבע | Phototeva");
    expect(result.client_id).toBe("c1-uuid");
    expect(result.title).toBe("לעדכן קריאייטיבים");
    expect(result.assignee_id).toBe("m1-uuid");
    // Creator is always the sender
    expect(result.creator_id).toBe("m1-uuid");
    expect(result.creator_name).toBe("Idan Alush");
  });

  it("parses due date when mentioned", async () => {
    const parsedResponse = {
      client_name: "שנקר הנדסאים",
      client_id: "c2-uuid",
      title: "להכין באנרים",
      description: "להכין באנרים לקמפיין שנקר",
      assignee_name: "Idan Alush",
      assignee_id: "m1-uuid",
      creator_name: "Idan Alush",
      creator_id: "m1-uuid",
      due_date: "2026-05-22",
      priority: "normal",
      confidence: 0.85,
    };

    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(parsedResponse) }],
    });

    const result = await parseTaskFromText(
      "משימה לשנקר עד יום חמישי - להכין באנרים",
      SENDER,
    );

    expect(result.due_date).not.toBeNull();
    expect(result.due_date).toBe("2026-05-22");
    expect(result.client_name).toBe("שנקר הנדסאים");
  });

  it("returns low confidence when no client mentioned", async () => {
    const parsedResponse = {
      client_name: "פוטוטבע | Phototeva",
      client_id: "c1-uuid",
      title: "לעדכן משהו",
      description: "לעדכן משהו",
      assignee_name: "Idan Alush",
      assignee_id: "m1-uuid",
      creator_name: "Idan Alush",
      creator_id: "m1-uuid",
      due_date: null,
      priority: "normal",
      confidence: 0.3,
    };

    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(parsedResponse) }],
    });

    const result = await parseTaskFromText("צריך לעדכן משהו", SENDER);

    expect(result.confidence).toBeLessThan(0.5);
  });

  it("calls Claude API with correct model", async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            client_name: "test",
            client_id: "c1-uuid",
            title: "test",
            description: "test",
            assignee_name: "Idan Alush",
            assignee_id: "m1-uuid",
            creator_name: "Idan Alush",
            creator_id: "m1-uuid",
            due_date: null,
            priority: "normal",
            confidence: 0.5,
          }),
        },
      ],
    });

    await parseTaskFromText("test", SENDER);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-sonnet-4-20250514",
        max_tokens: 512,
      }),
    );
  });
});
