import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { resolveConfig, type UserConfig } from "vite";
import ts from "typescript";
import { expect, it } from "vitest";
import unit from "../../vitest.config.js";
import integration from "../../vitest.integration.config.js";
import security from "../vitest.pilot-security.config.js";
import budget from "../vitest.operation-budget.config.js";
import composition from "../vitest.pilot-integration.config.js";
import plan from "../vitest.pilot-data-controls.config.js";
import postgres from "../vitest.pilot-security-postgres.config.js";

async function removeFixtureDirectory(directory: string): Promise<void> {
  if (
    resolve(dirname(directory)) !== resolve(tmpdir()) ||
    !basename(directory).startsWith("alvitra-test-env-isolation-")
  )
    throw new Error("Temporário fora do escopo do teste.");
  await rm(directory, { recursive: true, force: true });
}

it.each([
  ["unit", unit],
  ["integration", integration],
  ["security", security],
  ["budget", budget],
  ["composition", composition],
  ["plan", plan],
  ["postgres", postgres]
])("AC-7215: configuração %s não lê arquivo de ambiente", async (_name, candidate) => {
  const directory = await mkdtemp(join(tmpdir(), "alvitra-test-env-isolation-"));
  try {
    // This file belongs to this test. Never inspect or load workspace credentials.
    await writeFile(
      join(directory, ".env.test.local"),
      "VITE_SYNTHETIC_ENV_ISOLATION_CANARY=FICTICIO-NAO-IMPORTAR\n",
      { flag: "wx" }
    );
    const config = await resolveConfig(
      {
        ...(candidate as UserConfig),
        configFile: false,
        root: directory,
        cacheDir: join(directory, "cache")
      },
      "serve",
      "test"
    );
    expect(config.env.VITE_SYNTHETIC_ENV_ISOLATION_CANARY).toBeUndefined();
    expect(config.envDir).toBe(false);
  } finally {
    await removeFixtureDirectory(directory);
  }
});

it("AC-7215: proxy Vite aninhado não herda nem importa ambiente real", async () => {
  const source = ts.createSourceFile(
    "proxy.e2e.ts",
    await readFile("tests/e2e/demo-web-research.e2e.test.ts", "utf8"),
    ts.ScriptTarget.Latest,
    true
  );
  const argumentsFound: ts.ObjectLiteralExpression[] = [];
  function visit(node: ts.Node): void {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "createViteServer"
    ) {
      const argument = node.arguments[0];
      if (argument && ts.isObjectLiteralExpression(argument)) argumentsFound.push(argument);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  expect(argumentsFound).toHaveLength(1);
  // Execute the actual configuration object, never the test or a copied proxy setup.
  const candidate = new Function("apiOrigin", `return (${argumentsFound[0]!.getText(source)});`)(
    "http://127.0.0.1:1"
  ) as UserConfig;
  const directory = await mkdtemp(join(tmpdir(), "alvitra-test-env-isolation-"));
  try {
    await writeFile(
      join(directory, ".env.test.local"),
      "VITE_SYNTHETIC_ENV_ISOLATION_CANARY=FICTICIO-NAO-IMPORTAR\n",
      { flag: "wx" }
    );
    const config = await resolveConfig(
      { ...candidate, root: directory, cacheDir: join(directory, "cache") },
      "serve",
      "test"
    );
    expect(config.env.VITE_SYNTHETIC_ENV_ISOLATION_CANARY).toBeUndefined();
    expect(config.envDir).toBe(false);
  } finally {
    await removeFixtureDirectory(directory);
  }
});
