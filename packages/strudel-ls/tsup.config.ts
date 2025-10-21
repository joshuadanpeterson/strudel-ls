import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["esm"],
  target: "node18",
  sourcemap: true,
  clean: true,
  outDir: "dist",
  dts: false,
  external: [
    "vscode-languageserver",
    "vscode-languageserver-textdocument",
    "vscode-uri",
    "tree-sitter",
    "tree-sitter-strdl"
  ]
});