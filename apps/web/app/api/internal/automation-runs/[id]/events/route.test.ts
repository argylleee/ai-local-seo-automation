import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/automation-run-events", () => ({
  recordAutomationRunEvent: vi.fn(),
  AutomationRunEventError: class AutomationRunEventError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  },
}));
vi.mock("@/lib/internal-service-auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/internal-service-auth")>(
    "@/lib/internal-service-auth",
  );
  return { ...actual, verifyInternalServiceSecret: vi.fn() };
});

const { recordAutomationRunEvent, AutomationRunEventError } = await import(
  "@/lib/automation-run-events"
);
const { verifyInternalServiceSecret } = await import("@/lib/internal-service-auth");
const { POST } = await import("./route");

const RUN_ID = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";

function jsonRequest(body: unknown, secret = "correct-secret") {
  return new Request(`http://localhost/api/internal/automation-runs/${RUN_ID}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-internal-secret": secret },
    body: JSON.stringify(body),
  });
}

function params(id = RUN_ID) {
  return { params: Promise.resolve({ id }) };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/internal/automation-runs/:id/events", () => {
  it("returns 401 when the service secret is invalid", async () => {
    vi.mocked(verifyInternalServiceSecret).mockReturnValue(false);
    const response = await POST(
      jsonRequest({ eventType: "started", idempotencyKey: "k1" }, "wrong"),
      params(),
    );
    expect(response.status).toBe(401);
    expect(recordAutomationRunEvent).not.toHaveBeenCalled();
  });

  it("returns 400 for a non-UUID run id", async () => {
    vi.mocked(verifyInternalServiceSecret).mockReturnValue(true);
    const response = await POST(
      jsonRequest({ eventType: "started", idempotencyKey: "k1" }),
      params("not-a-uuid"),
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for an invalid event body", async () => {
    vi.mocked(verifyInternalServiceSecret).mockReturnValue(true);
    const response = await POST(jsonRequest({ eventType: "bogus" }), params());
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 404 when the automation run does not exist", async () => {
    vi.mocked(verifyInternalServiceSecret).mockReturnValue(true);
    vi.mocked(recordAutomationRunEvent).mockRejectedValue(
      new AutomationRunEventError("RUN_NOT_FOUND", "Automation run not found."),
    );
    const response = await POST(
      jsonRequest({ eventType: "started", idempotencyKey: "k1" }),
      params(),
    );
    expect(response.status).toBe(404);
  });

  it("returns ok + deduplicated flag on success", async () => {
    vi.mocked(verifyInternalServiceSecret).mockReturnValue(true);
    vi.mocked(recordAutomationRunEvent).mockResolvedValue({ deduplicated: true });
    const response = await POST(
      jsonRequest({ eventType: "succeeded", idempotencyKey: "k1" }),
      params(),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ ok: true, deduplicated: true });
  });
});
