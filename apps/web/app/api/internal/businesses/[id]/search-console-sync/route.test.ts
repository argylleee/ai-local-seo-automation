import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/internal-service-auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/internal-service-auth")>(
    "@/lib/internal-service-auth",
  );
  return { ...actual, verifyInternalServiceSecret: vi.fn() };
});
vi.mock("@/lib/search-console-sync", async () => {
  const actual = await vi.importActual<typeof import("@/lib/search-console-sync")>(
    "@/lib/search-console-sync",
  );
  return { ...actual, runSearchConsoleSync: vi.fn() };
});
vi.mock("@local-seo/db", () => ({
  db: { select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn() })) })) })) },
}));

const { verifyInternalServiceSecret } = await import("@/lib/internal-service-auth");
const { runSearchConsoleSync, SearchConsoleSyncError } = await import("@/lib/search-console-sync");
const { db } = await import("@local-seo/db");
const { POST } = await import("./route");

const BUSINESS_ID = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";

function request(secret = "correct-secret") {
  return new Request(`http://localhost/api/internal/businesses/${BUSINESS_ID}/search-console-sync`, {
    method: "POST",
    headers: { "x-internal-secret": secret },
  });
}

function params(id = BUSINESS_ID) {
  return { params: Promise.resolve({ id }) };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/internal/businesses/:id/search-console-sync", () => {
  it("returns 401 when the service secret is invalid", async () => {
    vi.mocked(verifyInternalServiceSecret).mockReturnValue(false);
    const response = await POST(request("wrong"), params());
    expect(response.status).toBe(401);
    expect(runSearchConsoleSync).not.toHaveBeenCalled();
  });

  it("returns 400 for a non-UUID business id", async () => {
    vi.mocked(verifyInternalServiceSecret).mockReturnValue(true);
    const response = await POST(request(), params("not-a-uuid"));
    expect(response.status).toBe(400);
  });

  it("returns 404 when the business does not exist", async () => {
    vi.mocked(verifyInternalServiceSecret).mockReturnValue(true);
    vi.mocked(db.select).mockReturnValue({
      from: () => ({ where: () => ({ limit: () => Promise.resolve([]) }) }),
    } as never);
    const response = await POST(request(), params());
    expect(response.status).toBe(404);
  });

  it("maps a SearchConsoleSyncError to its documented status code", async () => {
    vi.mocked(verifyInternalServiceSecret).mockReturnValue(true);
    vi.mocked(db.select).mockReturnValue({
      from: () => ({ where: () => ({ limit: () => Promise.resolve([{ organizationId: "org-1" }]) }) }),
    } as never);
    vi.mocked(runSearchConsoleSync).mockRejectedValue(
      new SearchConsoleSyncError("Not connected.", "NOT_CONNECTED"),
    );
    const response = await POST(request(), params());
    expect(response.status).toBe(409);
  });

  it("returns the sync result on success", async () => {
    vi.mocked(verifyInternalServiceSecret).mockReturnValue(true);
    vi.mocked(db.select).mockReturnValue({
      from: () => ({ where: () => ({ limit: () => Promise.resolve([{ organizationId: "org-1" }]) }) }),
    } as never);
    vi.mocked(runSearchConsoleSync).mockResolvedValue({
      auditId: "audit-1",
      issueCount: 2,
      rowCount: 10,
      recommendationCount: 1,
    });
    const response = await POST(request(), params());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ auditId: "audit-1", issueCount: 2, rowCount: 10, recommendationCount: 1 });
    expect(runSearchConsoleSync).toHaveBeenCalledWith("org-1", BUSINESS_ID);
  });
});
