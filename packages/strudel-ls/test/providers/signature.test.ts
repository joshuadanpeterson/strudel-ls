import { describe, it, expect } from "vitest";
import { TextDocument } from "vscode-languageserver-textdocument";
import { provideSignatureHelp } from "../../src/providers/signature";
import type { Builtin } from "../../src/data/types";

const builtinsArr: Builtin[] = [
  { name: "fast", kind: "transform", signature: "fast(n: number, pattern)" },
];
const builtins = new Map(builtinsArr.map((b) => [b.name, b]));

function doc(text: string) {
  return TextDocument.create("file:///test.str", "str", 1, text);
}

describe("provideSignatureHelp", () => {
  it("returns signature for call before paren", () => {
    const d = doc("fast(");
    const sig = provideSignatureHelp(d, { line: 0, character: 5 }, builtins);
    expect(sig).toBeTruthy();
    expect(sig!.signatures[0].label).toContain("fast(");
  });
});