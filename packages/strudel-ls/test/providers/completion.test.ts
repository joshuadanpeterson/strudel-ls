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
});