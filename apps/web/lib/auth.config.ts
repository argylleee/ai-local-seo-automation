import type { NextAuthConfig } from "next-auth";

const PROTECTED_PATH_PREFIXES = ["/dashboard", "/businesses", "/settings"];

/**
 * Edge-safe config: used directly by middleware.ts. Must not import
 * anything that touches Postgres (packages/db uses the postgres.js
 * driver, which is Node-only) — the full provider/DB-callback config
 * lives in auth.ts and only runs in the Node.js runtime.
 */
export const authConfig = {
  pages: {
    signIn: "/sign-in",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = Boolean(auth?.user);
      const isProtected = PROTECTED_PATH_PREFIXES.some((prefix) =>
        request.nextUrl.pathname.startsWith(prefix),
      );
      return !isProtected || isLoggedIn;
    },
  },
} satisfies NextAuthConfig;
