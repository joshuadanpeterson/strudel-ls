# strudel-ls

Language Server for Strudel files. Designed to work seamlessly with strudel.nvim in Neovim.

## What is Strudel?
Strudel is a Tidal-inspired pattern language and live-coding environment implemented in JavaScript. You write musical patterns such as `s("bd sd") |+ gain 0.8`, evaluate them live, and Strudel schedules audio via WebAudio or connected backends.

## What is strudel.nvim?
strudel.nvim is a Neovim plugin that brings Strudel into your editor: filetypes, evaluation commands, and a live-coding workflow. It handles running/evaluating code; this LSP adds static intelligence on top (completions, hover, diagnostics, formatting).

## Why this LSP?
- Context-aware completions for Strudel transforms and sound names
- Rich hover and signature help from Strudel docs
- Helpful diagnostics (unknown transforms, basic syntax issues)
- Optional formatting to keep patterns tidy

## Parser requirement
This project uses the tree-sitter parser from https://github.com/PedroZappa/tree-sitter-strdl for Strudel syntax. The npm dependency is declared as `tree-sitter-strdl` (sourced from GitHub). Ensure your environment can build native modules (tree-sitter) when installing.

For Neovim highlighting, configure nvim-treesitter to install the same grammar:

```lua path=null start=null
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

## Features
- Context-aware completions:
  - Inside `s("…")`: suggests sounds from bundled `sounds.json`
  - Elsewhere: suggests transforms/functions with snippet placeholders
- Hover: signature, blurb, and example when available
- Signature help: parameters derived from builtin signatures
- Diagnostics: unknown transform (with quick-fix), basic unterminated string check
- Formatting: pipe/comma spacing normalization and optional line wrapping
- Workspace: fast file discovery for `.str` and `.strdl`

## Supported filetypes and extensions
- Filetypes: `strudel`, `strdl`, `str`
- Extensions: `.strudel`, `.strdl`, `.str`, `.std`

The server accepts documents when the languageId is one of the above OR the URI ends with a supported extension.

## Neovim + strudel.nvim
strudel.nvim provides runtime/evaluation; this LSP provides editor intelligence. Use them together for a complete Strudel experience in Neovim.

### Install the LSP binary
Install globally with npm (Node >= 18):

```sh path=null start=null
npm i -g @strudel-tools/strudel-ls
```

This provides the `strudel-ls` executable used by lspconfig.

### Neovim setup with lspconfig

```lua path=null start=null
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

Optional filetype detection (if not provided by strudel.nvim):

```lua path=null start=null
vim.filetype.add({
  extension = {
    strudel = "strudel",
    strdl = "strdl",
    str = "str",
    std = "strudel",
  },
})
```

### Install with packer.nvim
Configure strudel.nvim (replace with the actual repository) and lspconfig:

```lua path=null start=null
use { 'neovim/nvim-lspconfig' }
use { 'owner/strudel.nvim' } -- replace "owner/strudel.nvim" with the real repo

require('lspconfig').strudel_ls.setup({
  cmd = { 'strudel-ls', '--stdio' },
  filetypes = { 'strudel', 'strdl', 'str' },
})
```

### Install with lazy.nvim

```lua path=null start=null
return {
  { 'neovim/nvim-lspconfig', config = function()
      local lspconfig = require('lspconfig')
      lspconfig.strudel_ls.setup({
        cmd = { 'strudel-ls', '--stdio' },
        filetypes = { 'strudel', 'strdl', 'str' },
      })
    end },
  { 'owner/strudel.nvim' }, -- replace with the real repo
}
```

### Using the LSP with strudel.nvim
- Open a `*.strdl`, `*.str`, or `*.strudel` file managed by strudel.nvim
- Start your Strudel session via strudel.nvim’s commands (evaluation, transport, etc.)
- As you type:
  - Inside `s("…")` you’ll get sound name completions (e.g. `bd`, `sd`, `hh`)
  - After `|>` and other combinators you’ll get transform completions with snippets
  - Hover over a transform to see documentation and examples
  - Signature help appears while filling parameters
- Run `:LspInfo` to confirm `strudel_ls` is attached

## VS Code setup

Associate extensions with the Strudel language:

```jsonc path=null start=null
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

```sh path=null start=null
npm i -D @strudel-tools/prettier-plugin-strudel prettier
prettier --plugin=@strudel-tools/prettier-plugin-strudel "**/*.{strudel,strdl,str,std}" --write
```

## Treesitter injections (optional)
A schematic example is provided in `src/queries/strudel/injections.scm` to inject JavaScript into fenced regions.

## Examples
See examples under `examples/basic-strudel-project/` for `main.strdl` and `main.str` starter patterns.

## E2E tests
To run headless E2E locally with a pinned plenary.nvim:

```sh path=null start=null
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
