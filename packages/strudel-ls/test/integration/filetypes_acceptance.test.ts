import { describe, it, expect } from "vitest";
import { TextDocument } from "vscode-languageserver-textdocument";
import { provideCompletions } from "../../src/providers/completion";
import { computeDiagnostics } from "../../src/analyzer/diagnostics";
import type { Builtin } from "../../src/data/types";
import builtins from "../../src/data/builtins.json" assert { type: "json" };

const builtinIndex = new Map<string, Builtin>((builtins as any).map((b: Builtin) => [b.name, b]));

function doc(uri: string, languageId: string, text: string) {
  return TextDocument.create(uri, languageId, 1, text);
}

describe("accepts strdl and str filetypes", () => {
  it("completions/diagnostics for languageId=strdl", () => {
    const d = doc("file:///tmp/a.strdl", "strdl", "foo(1) s(\"bd\")");
    const comps = provideCompletions(d, { line: 0, character: 1 }, builtinIndex, true, 50);
    expect(Array.isArray(comps)).toBe(true);
    const diags = computeDiagnostics(d, builtinIndex as any, {
      diagnostics: { enable: true, unknownTransform: "warning", unknownParameter: "warning", miniNotation: "info" },
      completions: { snippets: true, builtinsOnly: true, maxItems: 50 },
      formatting: { enable: true, lineWidth: 100 },
      semanticTokens: { enable: false },
      telemetry: { enable: false },
    } as any);
    expect(Array.isArray(diags)).toBe(true);
  });

  it("completions/diagnostics for languageId=str", () => {
    const d = doc("file:///tmp/a.str", "str", "slow(2) s(\"sn\")");
    const comps = provideCompletions(d, { line: 0, character: 1 }, builtinIndex, true, 50);
    expect(comps.length).toBeGreaterThan(0);
    const diags = computeDiagnostics(d, builtinIndex as any, {
      diagnostics: { enable: true, unknownTransform: "warning", unknownParameter: "warning", miniNotation: "info" },
      completions: { snippets: true, builtinsOnly: true, maxItems: 50 },
      formatting: { enable: true, lineWidth: 100 },
      semanticTokens: { enable: false },
      telemetry: { enable: false },
    } as any);
    expect(Array.isArray(diags)).toBe(true);
  });
});