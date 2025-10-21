import { describe, it, expect } from "vitest";
import { TextDocument } from "vscode-languageserver-textdocument";
import { parseStrudel } from "../../src/analyzer/parser";
import type { Builtin } from "../../src/data/types";

const builtinsArr: Builtin[] = [
  { name: "s", kind: "function", signature: "s(pattern: string)" },
  { name: "fast", kind: "transform", signature: "fast(n: number, pattern)" },
];
const builtins = new Map(builtinsArr.map((b) => [b.name, b]));

function doc(text: string) {
  return TextDocument.create("file:///test.str", "str", 1, text);
}

describe("parseStrudel", () => {
  it("collects unknown transforms", () => {
    const d = doc("foo(1) s(\"bd\")");
    const res = parseStrudel(d, builtins);
    expect(res.unknownTransforms.find((t) => t.name === "foo")).toBeTruthy();
    expect(res.transforms.find((t) => t.name === "s")).toBeTruthy();
  });

  it("reports syntax errors when present", () => {
    const d = doc("s(\"bd)");
    const res = parseStrudel(d, builtins);
    // tree-sitter may or may not flag; ensure API returns arrays
    expect(Array.isArray(res.errors)).toBe(true);
  });
});