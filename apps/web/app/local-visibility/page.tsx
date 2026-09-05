import { AddVisibilitySnapshotForm } from "@/app/local-visibility/visibility-forms";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { db } from "@local-seo/db";
import { businessLocations, businesses, businessVisibilitySnapshots } from "@local-seo/db/schema";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";

const METRIC_LABEL: Record<string, string> = {
  map_pack_position: "Map-pack position",
  profile_views: "Profile views",
  search_views: "Search views",
  website_clicks: "Website clicks",
  call_clicks: "Call clicks",
  direction_requests: "Direction requests",
};

export default async function LocalVisibilityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.organizationId) {
    redirect("/sign-in");
  }

  const orgBusinesses = await db
    .select({ id: businesses.id, name: businesses.name })
    .from(businesses)
    .where(eq(businesses.organizationId, session.organizationId));

  if (orgBusinesses.length === 0) {
    return (
      <AppShell>
        <div className="space-y-6">
          <h1 className="text-xl font-semibold">Local Visibility</h1>
          <Card>
            <CardHeader>
              <CardTitle>No businesses yet</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              Add a business first — see the Businesses page.
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  const params = await searchParams;
  const requestedBusinessId = typeof params.business === "string" ? params.business : undefined;
  const selected =
    orgBusinesses.find((business) => business.id === requestedBusinessId) ?? orgBusinesses[0]!;

  const [location] = await db
    .select()
    .from(businessLocations)
    .where(eq(businessLocations.businessId, selected.id))
    .limit(1);

  const snapshots = await db
    .select()
    .from(businessVisibilitySnapshots)
    .where(eq(businessVisibilitySnapshots.businessId, selected.id))
    .orderBy(desc(businessVisibilitySnapshots.capturedAt))
    .limit(20);

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-xl font-semibold">Local Visibility</h1>
          {orgBusinesses.length > 1 ? (
            <div className="flex flex-wrap gap-1">
              {orgBusinesses.map((business) => (
                <Link
                  key={business.id}
                  href={`/local-visibility?business=${business.id}`}
                  className={
                    business.id === selected.id
                      ? "rounded-md bg-secondary px-3 py-1.5 text-sm"
                      : "text-muted-foreground rounded-md px-3 py-1.5 text-sm hover:text-foreground"
                  }
                >
                  {business.name}
                </Link>
              ))}
            </div>
          ) : null}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Business location</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            {location ? (
              <ul className="space-y-1">
                <li>
                  {[location.addressLine1, location.addressLine2, location.city, location.province]
                    .filter(Boolean)
                    .join(", ") || "No address on file"}
                </li>
                <li>Region: {location.region ?? "—"}</li>
                <li>Timezone: {location.timezone}</li>
                {location.latitude && location.longitude ? (
                  <li>
                    Coordinates: {location.latitude}, {location.longitude}
                  </li>
                ) : null}
              </ul>
            ) : (
              "No location on file for this business yet."
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Map-pack / Google Business Profile visibility</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-4 text-sm">
            <p>
              No automated sync yet — Google Business Profile APIs require separate developer
              access approval from Google (docs/integrations.md), which is free but not guaranteed
              or instant. Until it's approved, log what you see in your own GBP dashboard (or a
              manual map-pack search) below; nothing here is fabricated, and once GBP access is
              approved this same table starts filling in automatically.
            </p>
            {snapshots.length === 0 ? (
              <p>No snapshots logged yet.</p>
            ) : (
              <ul className="divide-border divide-y">
                {snapshots.map((snapshot) => (
                  <li key={snapshot.id} className="flex items-center justify-between gap-4 py-2">
                    <span className="text-foreground">
                      {METRIC_LABEL[snapshot.metricType] ?? snapshot.metricType}
                      {snapshot.keyword ? ` — "${snapshot.keyword}"` : ""}
                    </span>
                    <span>
                      <span className="text-foreground font-medium">{snapshot.value}</span>{" "}
                      {snapshot.unit ?? ""} ·{" "}
                      {snapshot.capturedAt.toLocaleDateString("en-PH", { dateStyle: "medium" })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Log a visibility snapshot</CardTitle>
          </CardHeader>
          <CardContent>
            <AddVisibilitySnapshotForm businessId={selected.id} />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
