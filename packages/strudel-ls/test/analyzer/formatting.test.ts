import { describe, it, expect } from "vitest";
import { TextDocument } from "vscode-languageserver-textdocument";
import { formatDocument } from "../../src/analyzer/formatting";

function doc(text: string) {
  return TextDocument.create("file:///test.strdl", "strdl", 1, text);
}

describe("formatDocument", () => {
  it("normalizes pipe spacing outside strings", () => {
    const d = doc('s("bd")|s("sn")');
    const edits = formatDocument(d, 120);
    const out = (edits[0]?.newText) ?? d.getText();
    expect(out).toBe('s("bd") | s("sn")');
  });

  it("normalizes comma spacing", () => {
    const d = doc('fast(2 ,s("bd"))');
    const out = (formatDocument(d, 120)[0]?.newText) ?? d.getText();
    expect(out).toBe('fast(2, s("bd"))');
  });

  it("respects prettier-ignore for next line", () => {
    const d = doc('// prettier-ignore\nfast(2 ,s("bd"))');
    const out = (formatDocument(d, 120)[0]?.newText) ?? d.getText();
    expect(out.split("\n")[1]).toBe('fast(2 ,s("bd"))');
  });

  it("wraps long lines by pipes", () => {
    const d = doc('s("bd*4") | s("sn*4") | s("cp*4")');
    const out = (formatDocument(d, 20)[0]?.newText) ?? d.getText();
    const lines = out.split("\n");
    expect(lines.length).toBeGreaterThan(1);
    expect(lines[0].length).toBeLessThanOrEqual(20);
  });
});