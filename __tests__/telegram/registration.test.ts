import { describe, it, expect, vi, beforeEach } from "vitest";

// Track all sendMessage calls
const mockSendMessage = vi.fn().mockResolvedValue({ ok: true });
vi.mock("@/lib/telegram/api", () => ({
  sendMessage: (...args: unknown[]) => mockSendMessage(...args),
}));

// Supabase mock helpers
let mockDbData: Record<string, unknown> = {};
const mockInsert = vi.fn().mockResolvedValue({ error: null });
const mockUpdate = vi.fn(() => ({
  eq: vi.fn().mockResolvedValue({ error: null }),
}));
const mockDeleteChain = vi.fn(() => ({
  eq: vi.fn().mockResolvedValue({ error: null }),
}));
const mockMaybeSingle = vi.fn();
const mockEq = vi.fn();

function buildSelectChain() {
  return {
    eq: (...args: unknown[]) => {
      mockEq(...args);
      return {
        eq: (...args2: unknown[]) => {
          mockEq(...args2);
          return { maybeSingle: mockMaybeSingle };
        },
        maybeSingle: mockMaybeSingle,
      };
    },
    maybeSingle: mockMaybeSingle,
  };
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => ({
      select: () => buildSelectChain(),
      insert: mockInsert,
      update: () => ({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      delete: () => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
  }),
}));

import {
  getRegisteredMember,
  handleRegistration,
} from "@/lib/telegram/registration";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getRegisteredMember", () => {
  it("returns member when telegram_user_id exists", async () => {
    const member = {
      id: "m1-uuid",
      full_name: "Idan Alush",
      email: "idan@b-bright.co.il",
      telegram_user_id: 12345,
    };
    mockMaybeSingle.mockResolvedValue({ data: member, error: null });

    const result = await getRegisteredMember(12345);
    expect(result).toEqual(member);
  });

  it("returns null for unknown telegram user", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await getRegisteredMember(99999);
    expect(result).toBeNull();
  });
});

describe("handleRegistration", () => {
  it("asks for email on first contact", async () => {
    // No pending registration exists
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await handleRegistration(12345, 67890, "שלום");

    expect(result).toBe(false);
    expect(mockInsert).toHaveBeenCalled();
    expect(mockSendMessage).toHaveBeenCalledWith(
      67890,
      "שלום! כדי להשתמש בבוט, שלח/י את כתובת המייל שלך ב-Bright",
    );
  });

  it("registers user with valid @b-bright.co.il email", async () => {
    // First call: pending registration exists
    // Second call: team member found
    mockMaybeSingle
      .mockResolvedValueOnce({ data: { id: "pending-1" }, error: null })
      .mockResolvedValueOnce({
        data: { id: "m1-uuid", full_name: "Idan Alush" },
        error: null,
      });

    const result = await handleRegistration(
      12345,
      67890,
      "idan@b-bright.co.il",
    );

    expect(result).toBe(true);
    expect(mockSendMessage).toHaveBeenCalledWith(
      67890,
      "נרשמת בהצלחה, Idan Alush! אפשר להתחיל לפתוח משימות.",
    );
  });

  it("rejects non-bright email", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { id: "pending-1" },
      error: null,
    });

    const result = await handleRegistration(
      12345,
      67890,
      "user@gmail.com",
    );

    expect(result).toBe(false);
    expect(mockSendMessage).toHaveBeenCalledWith(
      67890,
      "המייל לא נמצא במערכת. נסה שוב או פנה למנהל",
    );
  });

  it("rejects email that looks invalid", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { id: "pending-1" },
      error: null,
    });

    const result = await handleRegistration(12345, 67890, "not-an-email");

    expect(result).toBe(false);
    expect(mockSendMessage).toHaveBeenCalledWith(
      67890,
      "זה לא נראה כמו כתובת מייל. נסה שוב.",
    );
  });

  it("rejects bright email not in team_members", async () => {
    mockMaybeSingle
      .mockResolvedValueOnce({ data: { id: "pending-1" }, error: null })
      .mockResolvedValueOnce({ data: null, error: null });

    const result = await handleRegistration(
      12345,
      67890,
      "nobody@b-bright.co.il",
    );

    expect(result).toBe(false);
    expect(mockSendMessage).toHaveBeenCalledWith(
      67890,
      "המייל לא נמצא במערכת. נסה שוב או פנה למנהל",
    );
  });
});
