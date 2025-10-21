import { describe, it, expect } from "vitest";
import { TextDocument } from "vscode-languageserver-textdocument";
import { parseStrudel } from "../../src/analyzer/parser";
import type { Builtin } from "../../src/data/types";

const builtinsArr: Builtin[] = [
  { name: "s", kind: "function", signature: "s(pattern: string)" },
];
const builtins = new Map(builtinsArr.map((b) => [b.name, b]));

function doc(text: string) {
  return TextDocument.create("file:///test.str", "str", 1, text);
}

describe("heuristics", () => {
  it("flags unterminated string literal", () => {
    const d = doc("s(\"bd)");
    const res = parseStrudel(d, builtins);
    expect(res.errors.find((e) => e.message.includes("Unterminated"))).toBeTruthy();
  });
});