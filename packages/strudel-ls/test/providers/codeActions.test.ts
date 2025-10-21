import { describe, it, expect } from "vitest";
import { TextDocument } from "vscode-languageserver-textdocument";
import { computeDiagnostics } from "../../src/analyzer/diagnostics";
import { provideCodeActions } from "../../src/providers/codeActions";
import type { Builtin } from "../../src/data/types";

const builtinsArr: Builtin[] = [
  { name: "fast", kind: "transform", signature: "fast(n: number, pattern)" },
  { name: "s", kind: "function", signature: "s(pattern: string)" },
];
const builtins = new Map(builtinsArr.map((b) => [b.name, b]));

function doc(text: string) {
  return TextDocument.create("file:///test.strdl", "strdl", 1, text);
}

describe("provideCodeActions", () => {
  it("suggests replace for unknown transform", () => {
    const d = doc("faxt(2, s(\"bd\"))");
    const diags = computeDiagnostics(
      d,
      builtins as any,
      {
        diagnostics: { enable: true, unknownTransform: "warning", unknownParameter: "warning", miniNotation: "info" },
        completions: { snippets: true, builtinsOnly: true, maxItems: 50 },
        formatting: { enable: true, lineWidth: 100 },
        semanticTokens: { enable: false },
        telemetry: { enable: false },
      } as any,
    );
    const params: any = { context: { diagnostics: diags }, textDocument: { uri: d.uri } };
    const actions = provideCodeActions(params, d, builtins as any);
    expect(actions.some((a) => a.title.includes('fast'))).toBe(true);
  });
});