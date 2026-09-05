import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { db } from "@local-seo/db";
import { businesses } from "@local-seo/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export default async function BusinessesPage() {
  const session = await auth();
  if (!session?.organizationId) {
    redirect("/sign-in");
  }

  const orgBusinesses = await db
    .select({ id: businesses.id, name: businesses.name, category: businesses.category })
    .from(businesses)
    .where(eq(businesses.organizationId, session.organizationId));

  return (
    <AppShell>
      <div className="space-y-6">
        <h1 className="text-xl font-semibold">Businesses</h1>

        {orgBusinesses.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No businesses yet</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              {/* Create-business form/API lands with the businesses feature module. */}
              Businesses you add will appear here.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {orgBusinesses.map((business) => (
              <Card key={business.id}>
                <CardHeader>
                  <CardTitle>{business.name}</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm">
                  {business.category ?? "No category set"}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
