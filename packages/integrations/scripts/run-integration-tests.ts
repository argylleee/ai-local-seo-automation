import { execFileSync, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CONTAINER_NAME = "local-seo-integrations-test-db";
const HOST_PORT = 55433;
const DATABASE_URL = `postgres://postgres:postgres@localhost:${HOST_PORT}/local_seo_test`;
const dbPackageDir = path.resolve(fileURLToPath(import.meta.url), "../../../db");

// Only `npx` needs shell resolution on Windows (it's a .cmd shim);
// `docker` is a real executable there. Passing shell:true unconditionally
// makes Node warn (DEP0190) about unescaped args.
function run(
  command: string,
  args: string[],
  options: { cwd?: string; env?: NodeJS.ProcessEnv } = {},
) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32" && command === "npx",
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}`);
  }
}

function sleepSync(ms: number): void {
  execFileSync(process.execPath, ["-e", `setTimeout(() => {}, ${ms})`]);
}

function waitForPostgres(): void {
  for (let attempt = 0; attempt < 30; attempt++) {
    const result = spawnSync("docker", ["exec", CONTAINER_NAME, "pg_isready", "-U", "postgres"]);
    if (result.status === 0) return;
    sleepSync(1000);
  }
  throw new Error("Postgres did not become ready in time.");
}

function main() {
  spawnSync("docker", ["rm", "-f", CONTAINER_NAME]); // ignore failure if it doesn't exist

  console.log("Starting throwaway Postgres for integration tests...");
  run("docker", [
    "run",
    "-d",
    "--name",
    CONTAINER_NAME,
    "-e",
    "POSTGRES_PASSWORD=postgres",
    "-e",
    "POSTGRES_DB=local_seo_test",
    "-p",
    `${HOST_PORT}:5432`,
    "postgres:16-alpine",
  ]);

  try {
    waitForPostgres();

    console.log("Running migrations...");
    run("npx", ["tsx", "src/migrate.ts"], {
      cwd: dbPackageDir,
      env: { ...process.env, DATABASE_URL },
    });

    console.log("Running integration tests...");
    run("npx", ["vitest", "run", "--config", "vitest.integration.config.ts"], {
      env: { ...process.env, DATABASE_URL },
    });
  } finally {
    console.log("Tearing down test database...");
    spawnSync("docker", ["rm", "-f", CONTAINER_NAME]);
  }
}

main();
