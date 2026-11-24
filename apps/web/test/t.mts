import assert from "node:assert/strict";

type Case = { name: string; fn: () => void | Promise<void> };
const cases: Case[] = [];

export function test(name: string, fn: Case["fn"]): void {
  cases.push({ name, fn });
}

export async function results(): Promise<{ passed: number; failed: number }> {
  let passed = 0;
  let failed = 0;
  for (const c of cases) {
    try {
      await c.fn();
      passed++;
      console.log(`  ✓ ${c.name}`);
    } catch (e) {
      failed++;
      console.log(`  ✗ ${c.name}\n    ${(e as Error).message.split("\n").join("\n    ")}`);
    }
  }
  return { passed, failed };
}

export { assert };
