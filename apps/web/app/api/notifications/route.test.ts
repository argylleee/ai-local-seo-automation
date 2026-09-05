import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@local-seo/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({ where: vi.fn(() => ({ orderBy: vi.fn(() => ({ limit: vi.fn() })) })) })),
    })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn() })) })),
  },
}));

const { auth } = await import("@/lib/auth");
const { db } = await import("@local-seo/db");
const { GET, POST } = await import("./route");

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/notifications", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns the organization's notifications", async () => {
    vi.mocked(auth).mockResolvedValue({ organizationId: "org-1", user: {}, expires: "" } as never);
    vi.mocked(db.select).mockReturnValue({
      from: () => ({
        where: () => ({
          orderBy: () => ({
            limit: () =>
              Promise.resolve([{ id: "n1", title: "Sync completed", body: null, readAt: null }]),
          }),
        }),
      }),
    } as never);

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.notifications).toHaveLength(1);
  });
});

describe("POST /api/notifications", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const response = await POST();
    expect(response.status).toBe(401);
  });

  it("marks unread notifications as read", async () => {
    vi.mocked(auth).mockResolvedValue({ organizationId: "org-1", user: {}, expires: "" } as never);
    const where = vi.fn();
    vi.mocked(db.update).mockReturnValue({ set: () => ({ where }) } as never);

    const response = await POST();
    expect(response.status).toBe(200);
    expect(where).toHaveBeenCalled();
  });
});
