import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { db } from "@local-seo/db";
import { businessLocations, businesses } from "@local-seo/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";

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
          <CardContent className="text-muted-foreground text-sm">
            Not available yet. Google Business Profile APIs require separate developer access
            approval from Google (docs/integrations.md) — this isn't a missing feature so much as a
            pending external dependency. No ranking, map-pack position, or visibility data is
            fabricated in the meantime.
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
