import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { discoverStrudelFiles } from "../../src/workspace/discovery";

function setup() {
  const dir = mkdtempSync(join(tmpdir(), "strudel-discovery-"));
  mkdirSync(join(dir, "node_modules", "pkg"), { recursive: true });
  mkdirSync(join(dir, ".git", "objects"), { recursive: true });
  writeFileSync(join(dir, "a.strdl"), "s(\"bd\")\n");
  writeFileSync(join(dir, "b.str"), "s(\"sn\")\n");
  writeFileSync(join(dir, "c.txt"), "noop\n");
  writeFileSync(join(dir, "node_modules", "pkg", "x.strdl"), "ignored\n");
  writeFileSync(join(dir, ".git", "objects", "y.str"), "ignored\n");
  return dir;
}

describe("discoverStrudelFiles", () => {
  it("finds .strdl and .str, excludes node_modules/.git", async () => {
    const dir = setup();
    try {
      const files = await discoverStrudelFiles(dir);
      expect(files.some((f) => f.endsWith("a.strdl"))).toBe(true);
      expect(files.some((f) => f.endsWith("b.str"))).toBe(true);
      expect(files.some((f) => f.includes("node_modules"))).toBe(false);
      expect(files.some((f) => f.includes("/.git/"))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});