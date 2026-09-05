import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/internal-service-auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/internal-service-auth")>(
    "@/lib/internal-service-auth",
  );
  return { ...actual, verifyInternalServiceSecret: vi.fn() };
});
vi.mock("@/lib/website-audit-sync", async () => {
  const actual = await vi.importActual<typeof import("@/lib/website-audit-sync")>(
    "@/lib/website-audit-sync",
  );
  return { ...actual, runWebsiteAudit: vi.fn() };
});
vi.mock("@local-seo/db", () => ({
  db: { select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn() })) })) })) },
}));

const { verifyInternalServiceSecret } = await import("@/lib/internal-service-auth");
const { runWebsiteAudit, WebsiteAuditError } = await import("@/lib/website-audit-sync");
const { db } = await import("@local-seo/db");
const { POST } = await import("./route");

const BUSINESS_ID = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";

function request(secret = "correct-secret") {
  return new Request(`http://localhost/api/internal/businesses/${BUSINESS_ID}/website-audit`, {
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

describe("POST /api/internal/businesses/:id/website-audit", () => {
  it("returns 401 when the service secret is invalid", async () => {
    vi.mocked(verifyInternalServiceSecret).mockReturnValue(false);
    const response = await POST(request("wrong"), params());
    expect(response.status).toBe(401);
    expect(runWebsiteAudit).not.toHaveBeenCalled();
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

  it("maps a WebsiteAuditError to its documented status code", async () => {
    vi.mocked(verifyInternalServiceSecret).mockReturnValue(true);
    vi.mocked(db.select).mockReturnValue({
      from: () => ({ where: () => ({ limit: () => Promise.resolve([{ organizationId: "org-1" }]) }) }),
    } as never);
    vi.mocked(runWebsiteAudit).mockRejectedValue(
      new WebsiteAuditError("No website set.", "NO_WEBSITE"),
    );
    const response = await POST(request(), params());
    expect(response.status).toBe(422);
  });

  it("returns the audit result on success", async () => {
    vi.mocked(verifyInternalServiceSecret).mockReturnValue(true);
    vi.mocked(db.select).mockReturnValue({
      from: () => ({ where: () => ({ limit: () => Promise.resolve([{ organizationId: "org-1" }]) }) }),
    } as never);
    vi.mocked(runWebsiteAudit).mockResolvedValue({
      auditId: "audit-1",
      issueCount: 3,
      recommendationCount: 2,
    });
    const response = await POST(request(), params());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ auditId: "audit-1", issueCount: 3, recommendationCount: 2 });
    expect(runWebsiteAudit).toHaveBeenCalledWith("org-1", BUSINESS_ID);
  });
});
