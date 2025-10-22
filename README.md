# Strudel Language Server (strudel-ls)

Language tooling for Strudel, with first-class Neovim support via strudel.nvim and general LSP clients.

- Packages in this repo:
  - `@strudel-tools/strudel-ls` — the Language Server (primary package)
  - `@strudel-tools/prettier-plugin-strudel` — minimal Prettier plugin that recognizes Strudel files

> Looking for package-specific docs? See [packages/strudel-ls/README.md](packages/strudel-ls/README.md) and [packages/strudel-prettier-plugin/README.md](packages/strudel-prettier-plugin/README.md).

## What is Strudel?
Strudel is a Tidal-inspired pattern language and live-coding environment implemented in JavaScript. You write musical patterns like:

```text path=null start=null
s("bd sd") |+ gain 0.8 |> degradeBy 0.2
```

Evaluate them live; Strudel schedules audio via WebAudio or connected backends.

## What is strudel.nvim?
strudel.nvim is a Neovim plugin that brings Strudel into your editor—filetypes, evaluation commands, and a live-coding workflow. It handles running/evaluating code; this LSP adds static intelligence on top (completions, hover, signature help, diagnostics, and formatting helpers).

## Why this LSP?
- Context-aware completions for Strudel transforms and sound names (e.g., inside `s("…")`)
- Rich hover and signature help derived from Strudel docs
- Helpful diagnostics (unknown transforms, basic syntax issues)
- Optional formatting to keep patterns tidy
- Works with Neovim (via lspconfig, Mason), VS Code, and any LSP client

## Install

### LSP binary
Install globally (Node >= 18):

```sh path=null start=null
npm i -g @strudel-tools/strudel-ls
```

This provides the `strudel-ls` executable.

### Neovim with strudel.nvim
Use strudel.nvim for evaluation/runtime and this LSP for editor intelligence.

- lspconfig setup:

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

- packer.nvim:

```lua path=null start=null
use { 'neovim/nvim-lspconfig' }
use { 'gruvw/strudel.nvim' }

require('lspconfig').strudel_ls.setup({
  cmd = { 'strudel-ls', '--stdio' },
  filetypes = { 'strudel', 'strdl', 'str' },
})
```

- lazy.nvim:

```lua path=null start=null
return {
  { 'neovim/nvim-lspconfig', config = function()
      require('lspconfig').strudel_ls.setup({
        cmd = { 'strudel-ls', '--stdio' },
        filetypes = { 'strudel', 'strdl', 'str' },
      })
    end },
{ 'gruvw/strudel.nvim' },
}
```

Optional filetype detection (if your setup doesn’t provide it):

```lua path=null start=null
vim.filetype.add({
  extension = { strudel = "strudel", strdl = "strdl", str = "str", std = "strudel" },
})
```

### VS Code
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

## Features
- Completions
  - Inside `s("…")`: suggests sounds from bundled `sounds.json`
  - Elsewhere: suggests transforms/functions with snippet placeholders
  - Data source for completions: Strudel's API Reference and built-in sound library (bundled via `builtins.json` and `sounds.json`)
- Hover: signature, blurb, and example when available
- Signature help: parameters derived from builtin signatures
- Diagnostics: unknown transform (with quick-fix), basic unterminated string check
- Formatting: pipe/comma spacing normalization and optional line wrapping
- Workspace: fast file discovery for `.str` and `.strdl`

Supported filetypes: `strudel`, `strdl`, `str` · Extensions: `.strudel`, `.strdl`, `.str`, `.std`

## Parser requirement
Uses the Strudel tree-sitter grammar from https://github.com/PedroZappa/tree-sitter-strdl via the npm dependency `tree-sitter-strdl` (sourced from GitHub). Ensure native build tools are available to compile tree-sitter.

For Neovim highlighting, you can add the same grammar to nvim-treesitter:

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

## Monorepo layout
- `packages/strudel-ls` — Language Server (this repo’s main package)
- `packages/strudel-prettier-plugin` — Prettier plugin recognizing Strudel files

## Development
Requirements: Node >= 18.

Common tasks (run from repo root):

```sh path=null start=null
npm -w packages/strudel-ls run typecheck
npm -w packages/strudel-ls run build
npm -w packages/strudel-ls run test:all   # unit + e2e
npm -w packages/strudel-ls run e2e:setup  # vendors pinned plenary.nvim for E2E
```

Data generation (uses upstream Strudel docs and sound sets):

- Upstream Strudel repository: https://codeberg.org/uzu/strudel
- Data generation depends on having a local clone of the upstream Strudel repo. Most users do not need this: builtins.json and sounds.json are prebuilt and ship with the language server, so completions and hovers work out of the box.
- Maintainers: to regenerate data, clone Strudel locally and run:
  - cd packages/strudel-ls
  - STRUDEL_REPO=/path/to/your/local/strudel npm run build:data

```sh path=null start=null
# Set your local Strudel repo path to enrich builtins/hover/signatures
STRUDEL_REPO=/absolute/path/to/strudel \
  npm -w packages/strudel-ls run build:data
```

This parses Strudel's API Reference (`doc.json`) and built-in sound library metadata to produce `builtins.json` and `sounds.json` bundled with the server.

## E2E tests and pinned dependency
The E2E suite depends on `plenary.nvim` pinned to a known commit for stability. The setup script vendors it at the expected SHA before tests.

## Versioning & releases
- Prereleases published with the `next` dist-tag (e.g., `0.1.1-next.0`)
- Stable releases follow semver
- See package CHANGELOG and (local-only) `RELEASE_PROTOCOL.md` for detailed steps

## Contributing
- Use multi-line Conventional Commits (e.g., `feat: …`, `fix: …`, `docs: …`)
- Add or update tests; aim for 80%+ coverage
- Run typecheck, build, and all tests locally before opening a PR

## License
MIT © Strudel Tools contributors
