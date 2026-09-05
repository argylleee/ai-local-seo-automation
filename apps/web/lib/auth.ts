import NextAuth, { type Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import Google from "next-auth/providers/google";
import { authConfig } from "./auth.config";
import { ensureUserAndOrganization } from "./auth/provision";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set. Copy .env.example to .env and fill it in.`);
  }
  return value;
}

// next-auth's `Session`/`JWT` are type-only re-exports of interfaces
// declared in @auth/core (see @auth/core/types.d.ts, @auth/core/jwt.d.ts).
// Ambient `declare module` augmentation of those types does not reliably
// merge through that re-export, so we extend them locally instead and
// cast at the few boundaries that need the extra fields, rather than
// depending on global augmentation.
type AppJwt = JWT & { userId?: string; organizationId?: string };
export type AppSession = Session & {
  organizationId?: string;
  user: NonNullable<Session["user"]> & { id?: string };
};

// Google is the only login provider: it doubles as the identity provider
// for the Search Console/Business Profile integrations this product
// connects to later (docs/integrations.md), and docs/environment.md
// already names GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET for it.
//
// Login only ever requests basic identity scopes. Google's
// access/refresh tokens are never stored by Auth.js — we use JWT
// sessions (no database adapter), so there is no `accounts` table
// holding OAuth tokens in plaintext. When a user later connects
// Search Console/Business Profile, that is a separate consent flow
// whose tokens are encrypted at rest in oauth_connections
// (packages/db) — see docs/security.md.
const {
  handlers,
  auth: nextAuth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: requireEnv("GOOGLE_CLIENT_ID"),
      clientSecret: requireEnv("GOOGLE_CLIENT_SECRET"),
      authorization: { params: { scope: "openid email profile" } },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      const appToken = token as AppJwt;
      if (user?.email) {
        const { userId, organizationId } = await ensureUserAndOrganization({
          email: user.email,
          name: user.name ?? null,
        });
        appToken.userId = userId;
        appToken.organizationId = organizationId;
      }
      return appToken;
    },
    async session({ session, token }) {
      const appSession = session as AppSession;
      const appToken = token as AppJwt;
      if (appToken.userId) appSession.user.id = appToken.userId;
      if (appToken.organizationId) appSession.organizationId = appToken.organizationId;
      return appSession;
    },
  },
});

// Narrowed to the zero-arg server-component/server-action form, which is
// the only form used elsewhere in this app.
export const auth = nextAuth as unknown as () => Promise<AppSession | null>;
export { handlers, signIn, signOut };
