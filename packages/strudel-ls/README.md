# strudel-ls

Language Server for Strudel files with Neovim integration.

## Parser requirement
This project uses the tree-sitter parser from https://github.com/PedroZappa/tree-sitter-strdl for Strudel syntax. The npm dependency is declared as `tree-sitter-strdl` (sourced from GitHub). Ensure your environment can build native modules (tree-sitter) when installing.

For Neovim highlighting, configure nvim-treesitter to install the same grammar:

```lua
local parser_config = require("nvim-treesitter.parsers").get_parser_configs()
parser_config.strudel = {
  install_info = {
    url = "https://github.com/PedroZappa/tree-sitter-strdl",
    files = { "src/parser.c" },
    branch = "main",
  },
  filetype = "strudel",
}
```

## Features (MVP)
- Completions and hover from bundled builtins
- Parser-backed syntax diagnostics via tree-sitter-strdl
- Basic diagnostics: unknown transforms
- Formatting stub (no-op)

## Supported filetypes and extensions
- Filetypes: `strudel`, `strdl`, `str`
- Extensions: `.strudel`, `.strdl`, `.str`, `.std`

The server accepts documents when the languageId is one of the above OR the URI ends with a supported extension.

## VS Code setup

Associate extensions with the Strudel language:

```jsonc
{
  "files.associations": {
    "*.strudel": "strudel",
    "*.strdl": "strudel",
    "*.str": "strudel",
    "*.std": "strudel"
  }
}
```

Optional formatter support via Prettier (no-op plugin):

```sh
npm i -D @strudel-tools/prettier-plugin-strudel prettier
prettier --plugin=@strudel-tools/prettier-plugin-strudel "**/*.{strudel,strdl,str,std}" --write
```

## Neovim setup

lspconfig:

```lua
require("lspconfig").strudel_ls.setup({
  cmd = { "strudel-ls", "--stdio" },
  filetypes = { "strudel", "strdl", "str" },
  settings = {
    strudel = {
      diagnostics = { enable = true, unknownTransform = "warning" },
      completions = { snippets = true, builtinsOnly = true, maxItems = 50 },
      formatting = { enable = true, lineWidth = 100 },
      telemetry = { enable = false },
    },
  },
})
```

Optional filetype detection (distinct filetypes):

```lua
vim.filetype.add({
  extension = {
    strudel = "strudel",
    strdl = "strdl",
    str = "str",
    std = "strudel",
  },
})
```

Alternative (unified): map all extensions to `strudel`.

## Treesitter injections (optional)

A schematic example is provided in `src/queries/strudel/injections.scm` to inject JavaScript into fenced regions.

## Examples

See examples under `examples/basic-strudel-project/` for `main.strdl` and `main.str` starter patterns.

## E2E tests

To run headless E2E locally with a pinned plenary.nvim:

```sh
npm run -w packages/strudel-ls e2e
```

This will build the server, vendor plenary at a pinned SHA, and run the test suite with isolated runtimepath.

## Mason registry (example)

See `mason-registry/packages/strudel-ls/init.lua`.

## Acceptance checklist

- [x] Treesitter parser integrated (tree-sitter-strdl)
- [x] Filetypes/extensions: strudel, strdl, str, std
- [x] Completions and hover from builtins
- [x] Diagnostics: parser errors + unknown transforms
- [x] Neovim lspconfig snippet and filetype detection docs
- [x] VS Code file association guidance
- [x] Unit/integration tests passing
- [x] Coverage ≥ 80% enforced in unit tests
- [x] E2E headless tests in CI
- [ ] Formatting rules (beyond stub)
- [ ] Code actions/rename/semantic tokens (later milestone)

## License
MIT