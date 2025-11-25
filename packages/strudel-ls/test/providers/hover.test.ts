import { describe, it, expect } from "vitest";
import { TextDocument } from "vscode-languageserver-textdocument";
import { provideHover } from "../../src/providers/hover";
import type { Builtin } from "../../src/data/types";

const builtinsArr: Builtin[] = [
  { name: "fast", kind: "transform", signature: "fast(n: number, pattern)", blurb: "Speed up pattern." },
  { name: "segment", kind: "transform", signature: "segment(n: number)", blurb: "desc", example: 'note("a").segment(2)', synonyms: ["seg"] },
  { name: "seg", kind: "transform", signature: "segment(n: number)", blurb: "desc", example: 'note("a").segment(2)', aliasOf: "segment" },
];
const builtins = new Map(builtinsArr.map((b) => [b.name, b]));

function doc(text: string) {
  return TextDocument.create("file:///test.strdl", "strdl", 1, text);
}

describe("provideHover", () => {
  it("returns hover for known symbol", () => {
    const d = doc("fast(2, s(\"bd\"))");
    const h = provideHover(d, { line: 0, character: 1 }, builtins);
    expect(h).toBeTruthy();
    expect((h as any).contents.value).toContain("fast(");
  });

  it("shows aliases for canonical builtin", () => {
    const d = doc("segment(2)");
    const h = provideHover(d, { line: 0, character: 1 }, builtins)!;
    expect((h as any).contents.value).toContain("Aliases: seg");
    expect((h as any).contents.value).toContain("```strudel");
  });

  it("shows alias-of for alias builtin", () => {
    const d = doc("seg(2)");
    const h = provideHover(d, { line: 0, character: 1 }, builtins)!;
    expect((h as any).contents.value).toContain("Alias of: `segment`");
    expect((h as any).contents.value).toContain("```strudel");
  });

  it("returns hover for bank (case-insensitive)", () => {
    const d = doc('s("bd").bank("rolandtr808")');
    const h = provideHover(d, { line: 0, character: 15 }, builtins)!;
    expect((h as any).contents.value).toContain("**RolandTR808**");
    expect((h as any).contents.value).toContain("The legendary 1980 analog drum machine");
  });
});
