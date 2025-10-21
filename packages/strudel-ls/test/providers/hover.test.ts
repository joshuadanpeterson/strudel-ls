import { describe, it, expect } from "vitest";
import { TextDocument } from "vscode-languageserver-textdocument";
import { provideHover } from "../../src/providers/hover";
import type { Builtin } from "../../src/data/types";

const builtinsArr: Builtin[] = [
  { name: "fast", kind: "transform", signature: "fast(n: number, pattern)", blurb: "Speed up pattern." },
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
});