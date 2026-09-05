import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/search-console-sync", async () => {
  const actual = await vi.importActual<typeof import("@/lib/search-console-sync")>(
    "@/lib/search-console-sync",
  );
  return { ...actual, runSearchConsoleSync: vi.fn() };
});
vi.mock("@local-seo/db", () => ({
  db: {
    select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn() })) })) })),
  },
}));

const { auth } = await import("@/lib/auth");
const { runSearchConsoleSync, SearchConsoleSyncError } = await import("@/lib/search-console-sync");
const { db } = await import("@local-seo/db");
const { POST } = await import("./route");

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/audits", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/audits", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const response = await POST(
      jsonRequest({ businessId: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d" }),
    );
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 400 for an invalid body", async () => {
    vi.mocked(auth).mockResolvedValue({
      organizationId: "org-1",
      user: {},
      expires: "",
    } as never);
    const response = await POST(jsonRequest({ businessId: "not-a-uuid" }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("maps a SearchConsoleSyncError to its documented status code", async () => {
    vi.mocked(auth).mockResolvedValue({
      organizationId: "org-1",
      user: {},
      expires: "",
    } as never);
    vi.mocked(runSearchConsoleSync).mockRejectedValue(
      new SearchConsoleSyncError("Business not found in this organization.", "BUSINESS_NOT_FOUND"),
    );

    const response = await POST(
      jsonRequest({ businessId: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d" }),
    );
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error.code).toBe("BUSINESS_NOT_FOUND");
  });

  it("returns the documented { id, status, createdAt } shape on success", async () => {
    vi.mocked(auth).mockResolvedValue({
      organizationId: "org-1",
      user: {},
      expires: "",
    } as never);
    vi.mocked(runSearchConsoleSync).mockResolvedValue({
      auditId: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      issueCount: 2,
      rowCount: 10,
      recommendationCount: 1,
    });
    const createdAt = new Date();
    vi.mocked(db.select).mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () =>
            Promise.resolve([
              { id: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d", status: "completed", createdAt },
            ]),
        }),
      }),
    } as never);

    const response = await POST(
      jsonRequest({ businessId: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d" }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      id: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      status: "completed",
      createdAt: createdAt.toISOString(),
    });
  });
});
