import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/internal-service-auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/internal-service-auth")>(
    "@/lib/internal-service-auth",
  );
  return { ...actual, verifyInternalServiceSecret: vi.fn() };
});
vi.mock("@/lib/report-summary", () => ({ getReportSummary: vi.fn() }));
vi.mock("@local-seo/db", () => ({
  db: { select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn() })) })) })) },
}));

const { verifyInternalServiceSecret } = await import("@/lib/internal-service-auth");
const { getReportSummary } = await import("@/lib/report-summary");
const { db } = await import("@local-seo/db");
const { GET } = await import("./route");

const BUSINESS_ID = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";

function request(secret = "correct-secret") {
  return new Request(`http://localhost/api/internal/businesses/${BUSINESS_ID}/report-summary`, {
    headers: { "x-internal-secret": secret },
  });
}

function params(id = BUSINESS_ID) {
  return { params: Promise.resolve({ id }) };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/internal/businesses/:id/report-summary", () => {
  it("returns 401 when the service secret is invalid", async () => {
    vi.mocked(verifyInternalServiceSecret).mockReturnValue(false);
    const response = await GET(request("wrong"), params());
    expect(response.status).toBe(401);
    expect(getReportSummary).not.toHaveBeenCalled();
  });

  it("returns 400 for a non-UUID business id", async () => {
    vi.mocked(verifyInternalServiceSecret).mockReturnValue(true);
    const response = await GET(request(), params("not-a-uuid"));
    expect(response.status).toBe(400);
  });

  it("returns 404 when the business does not exist", async () => {
    vi.mocked(verifyInternalServiceSecret).mockReturnValue(true);
    vi.mocked(db.select).mockReturnValue({
      from: () => ({ where: () => ({ limit: () => Promise.resolve([]) }) }),
    } as never);
    const response = await GET(request(), params());
    expect(response.status).toBe(404);
  });

  it("returns the business plus its report summary on success", async () => {
    vi.mocked(verifyInternalServiceSecret).mockReturnValue(true);
    vi.mocked(db.select).mockReturnValue({
      from: () => ({
        where: () => ({ limit: () => Promise.resolve([{ id: BUSINESS_ID, name: "Acme" }]) }),
      }),
    } as never);
    vi.mocked(getReportSummary).mockResolvedValue({
      scoreHistory: [],
      issuesByCategory: {},
      recommendationCounts: { pending: 0, approved: 0, rejected: 0, completed: 0 },
    });

    const response = await GET(request(), params());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.business).toEqual({ id: BUSINESS_ID, name: "Acme" });
    expect(body.scoreHistory).toEqual([]);
    expect(getReportSummary).toHaveBeenCalledWith(BUSINESS_ID);
  });
});
