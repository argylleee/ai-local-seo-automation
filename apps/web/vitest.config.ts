import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(rootDir),
    },
  },
  test: {
    environment: "node",
    env: {
      DATABASE_URL: "postgres://placeholder:placeholder@localhost:5432/placeholder",
      TOKEN_ENCRYPTION_KEY: "10ik1PAfcXMWLQyYhlUqAOPo86fQnTuVUKq2vdUoNA0=",
      GOOGLE_CLIENT_ID: "test-client-id",
      GOOGLE_CLIENT_SECRET: "test-client-secret",
      APP_URL: "http://localhost:3000",
      AUTH_SECRET: "test-auth-secret",
    },
  },
});
