import { describe, it, expect } from "vitest";
import { TextDocument } from "vscode-languageserver-textdocument";
import { provideCompletions } from "../../src/providers/completion";
import type { Builtin } from "../../src/data/types";

const builtinsArr: Builtin[] = [
  { name: "s", kind: "function", signature: "s(pattern: string)" },
  { name: "slow", kind: "transform", signature: "slow(n: number, pattern)" },
];
const builtins = new Map(builtinsArr.map((b) => [b.name, b]));

function doc(text: string) {
  return TextDocument.create("file:///test.strdl", "strdl", 1, text);
}

describe("provideCompletions", () => {
  it("returns completions for builtins with snippets", () => {
    const d = doc("s");
    const items = provideCompletions(d, { line: 0, character: 1 }, builtins, true, 50);
    const labels = items.map((i) => i.label);
    expect(labels).toContain("s");
    expect(labels).toContain("slow");
  });

  it("requires 1+ typed char for sounds inside s(\"...\")", () => {
    const d = doc('s("")');
    // cursor inside quotes, with no prefix
    const items = provideCompletions(d, { line: 0, character: 3 }, builtins, true, 200);
    expect(items.length).toBe(0);
  });

  it("returns all matching sounds for a 1-char prefix (no cap)", () => {
    const d = doc('s("k")');
    // cursor after k inside quotes
    const items = provideCompletions(d, { line: 0, character: 4 }, builtins, true, 10);
    expect(items.length).toBeGreaterThan(0);
    for (const it of items) expect((it.label as string).toLowerCase().startsWith('k')).toBe(true);
  });

  it("includes example and alias info in builtin docs", () => {
    const localBuiltinsArr: Builtin[] = [
      { name: "segment", kind: "transform", signature: "segment(n: number)", blurb: "desc", example: 'note("a").segment(2)', synonyms: ["seg"] },
      { name: "seg", kind: "transform", signature: "segment(n: number)", blurb: "desc", example: 'note("a").segment(2)', aliasOf: "segment" },
    ];
    const localBuiltins = new Map(localBuiltinsArr.map((b) => [b.name, b]));
    const d = doc("segment seg");
    // cursor after the second word 'seg'
    const items = provideCompletions(d, { line: 0, character: 11 }, localBuiltins, true, 50);
    const segItem = items.find((i) => i.label === "seg")!;
    const segmentItem = items.find((i) => i.label === "segment")!;
    expect((segmentItem.documentation as any).value).toContain("Aliases: seg");
    expect((segmentItem.documentation as any).value).toContain("```strudel");
    expect((segItem.documentation as any).value).toContain("Alias of: `segment`");
  });
});
