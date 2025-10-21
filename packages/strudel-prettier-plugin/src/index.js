// Minimal Prettier plugin that recognizes Strudel files and performs no-op formatting.
// This allows teams to run Prettier across repos without errors on .str*, while
// the LSP provides language-aware formatting in the future.

const languages = [
  {
    name: "strudel",
    parsers: ["strudel"],
    extensions: [".strudel", ".strdl", ".str", ".std"],
    linguistLanguageId: 0,
  },
];

const parsers = {
  strudel: {
    astFormat: "strudel-ast",
    parse(text) {
      // Identity AST: we keep the original source so the printer can return it.
      return { type: "Program", body: text };
    },
    locStart() {
      return 0;
    },
    locEnd(node) {
      return (node && node.body && node.body.length) || 0;
    },
  },
};

const printers = {
  "strudel-ast": {
    print(path) {
      const node = path.getValue();
      return node.body || "";
    },
  },
};

export default { languages, parsers, printers };