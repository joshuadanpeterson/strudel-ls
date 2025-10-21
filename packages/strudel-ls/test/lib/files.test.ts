import { describe, it, expect } from "vitest";
import { isSupportedLanguageId, isSupportedUri } from "../../src/lib/files";

describe("files helpers", () => {
  it("accepts supported language IDs", () => {
    expect(isSupportedLanguageId("strudel")).toBe(true);
    expect(isSupportedLanguageId("strdl")).toBe(true);
    expect(isSupportedLanguageId("str")).toBe(true);
    expect(isSupportedLanguageId("std")).toBe(true);
  });

  it("rejects unsupported language IDs", () => {
    expect(isSupportedLanguageId("javascript")).toBe(false);
    expect(isSupportedLanguageId(undefined as any)).toBe(false);
  });

  it("accepts supported URIs by extension", () => {
    expect(isSupportedUri("file:///tmp/a.strudel")).toBe(true);
    expect(isSupportedUri("file:///tmp/a.strdl")).toBe(true);
    expect(isSupportedUri("file:///tmp/a.str")).toBe(true);
    expect(isSupportedUri("file:///tmp/a.std")).toBe(true);
  });

  it("rejects unsupported URIs", () => {
    expect(isSupportedUri("file:///tmp/a.txt")).toBe(false);
  });
});