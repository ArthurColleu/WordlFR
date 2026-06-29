import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  getServerSessionClient: vi.fn(),
  getServiceRoleClient: vi.fn(),
}));

import { requireAdminSession } from "./auth";
import { getServerSessionClient } from "@/lib/supabase/server";

describe("requireAdminSession", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns true when an authenticated user exists", async () => {
    (getServerSessionClient as any).mockReturnValue({
      auth: { getUser: async () => ({ data: { user: { id: "1" } } }) },
    });
    expect(await requireAdminSession()).toBe(true);
  });

  it("returns false when there is no authenticated user", async () => {
    (getServerSessionClient as any).mockReturnValue({
      auth: { getUser: async () => ({ data: { user: null } }) },
    });
    expect(await requireAdminSession()).toBe(false);
  });
});
