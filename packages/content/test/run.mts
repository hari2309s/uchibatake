/**
 * Tiny test runner: `pnpm test` runs every test/*.test.mts with tsx.
 * Each file registers cases with `test()`; failures exit non-zero.
 */
import { readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { results } from "./t.mts";

const dir = dirname(fileURLToPath(import.meta.url));
for (const f of readdirSync(dir).filter((f) => f.endsWith(".test.mts")).sort()) {
  await import(pathToFileURL(join(dir, f)).href);
}
const { passed, failed } = await results();
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
