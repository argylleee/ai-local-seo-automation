import { connectGoogleSearchConsole, disconnectGoogleSearchConsole } from "@/app/settings/actions";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { db } from "@local-seo/db";
import { businesses, integrations, organizations } from "@local-seo/db/schema";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

const INTEGRATION_ERROR_MESSAGES: Record<string, string> = {
  consent_declined: "Google sign-in was cancelled before granting access.",
  missing_params: "Google's response was missing required information.",
  invalid_state: "The connection request could not be verified. Please try again.",
  unknown_business: "That business could not be found in your organization.",
  connect_failed: "Connecting to Google failed. Please try again.",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.organizationId) {
    redirect("/sign-in");
  }

  const params = await searchParams;
  const connected = typeof params.connected === "string" ? params.connected : undefined;
  const integrationError =
    typeof params.integration_error === "string" ? params.integration_error : undefined;

  const [organization] = await db
    .select({ name: organizations.name, slug: organizations.slug })
    .from(organizations)
    .where(eq(organizations.id, session.organizationId))
    .limit(1);

  const businessIntegrations = await db
    .select({
      businessId: businesses.id,
      businessName: businesses.name,
      integrationId: integrations.id,
      status: integrations.status,
    })
    .from(businesses)
    .leftJoin(
      integrations,
      and(
        eq(integrations.businessId, businesses.id),
        eq(integrations.provider, "google_search_console"),
      ),
    )
    .where(eq(businesses.organizationId, session.organizationId));

  return (
    <AppShell>
      <div className="space-y-6">
        <h1 className="text-xl font-semibold">Settings</h1>

        {connected ? (
          <p role="status" className="rounded-md bg-secondary px-4 py-2 text-sm">
            Search Console connected successfully.
          </p>
        ) : null}
        {integrationError ? (
          <p
            role="alert"
            className="text-destructive rounded-md bg-destructive/10 px-4 py-2 text-sm"
          >
            {INTEGRATION_ERROR_MESSAGES[integrationError] ?? "Something went wrong."}
          </p>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Organization</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            {organization?.name} ({organization?.slug})
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Integrations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {businessIntegrations.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Add a business first — integrations connect to a specific business.
              </p>
            ) : (
              businessIntegrations.map((row) => (
                <div
                  key={row.businessId}
                  className="flex items-center justify-between gap-4 border-b pb-4 last:border-b-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-medium">{row.businessName}</p>
                    <p className="text-muted-foreground text-sm">
                      Google Search Console:{" "}
                      {row.status === "connected" ? "Connected" : "Not connected"}
                    </p>
                  </div>
                  {row.status === "connected" && row.integrationId ? (
                    <form action={disconnectGoogleSearchConsole.bind(null, row.integrationId)}>
                      <Button type="submit" variant="outline" size="sm">
                        Disconnect
                      </Button>
                    </form>
                  ) : (
                    <form action={connectGoogleSearchConsole.bind(null, row.businessId)}>
                      <Button type="submit" size="sm">
                        Connect Search Console
                      </Button>
                    </form>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
