import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

describe("Vite Plus pre-commit hook", () => {
  test("runs staged fixes and the full quality gate", () => {
    const repoRoot = resolve(import.meta.dirname, "../..");
    const hook = readFileSync(resolve(repoRoot, ".vite-hooks/pre-commit"), "utf8").trim();
    const packageJson = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8")) as {
      scripts?: Record<string, string>;
    };

    expect(hook).toContain("vp staged");
    expect(hook).toContain("pnpm run pre-commit:quality");
    expect(packageJson.scripts?.["pre-commit:quality"]).toBe(
      "pnpm format && pnpm lint && pnpm check && pnpm test",
    );
  });
});
