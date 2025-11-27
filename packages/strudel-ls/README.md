# @strudel-tools/strudel-ls

A feature-rich Language Server for [Strudel](https://strudel.cc), the live coding platform.

This LSP provides static analysis, auto-completion, and editor features to enhance your live coding experience in editors like Neovim and VS Code.

## ✨ Features

### 🧠 Intelligence
-   **Context-Aware Completions**:
    -   **Sounds**: Intelligent suggestions for samples inside `s("...")` or `sound("...")` (e.g., `s("bd")` → `bd`, `bd909`).
    -   **Banks**: Suggests specific banks for known sounds (e.g., `s("bd").bank("...")`).
    -   **Functions**: Snippet-based completions for transforms, combinators, and built-ins.
    -   **Enums**: Suggestions for function arguments with known choices (e.g., `scale("...")`).
-   **Rich Hover**: Documentation, signatures, parameter info, and examples for all Strudel functions.
-   **Signature Help**: Parameter hints as you type function arguments.

### 🔍 Navigation & Symbols
-   **Go to Definition**: Jump to variable or function declarations.
-   **Find References**: List all usages of a symbol.
-   **Document Symbols**: Outline view of variables and functions in the current file.

### 🛠️ Refactoring & Code Actions
-   **Rename**: Rename variables and references across the document.
-   **Code Actions**:
    -   **Quickfix**: Auto-fix unknown transforms (fuzzy match suggestions) or simple syntax errors.
    -   **Refactor**: Wrap code blocks (e.g., wrap selection in `stack`, `slow`, `jux`).
-   **Formatting**: Auto-format code (align pipes `|`, normalize spacing).

### 🎨 Syntax & Diagnostics
-   **Semantic Highlighting**: Advanced syntax highlighting for variables, functions, and parameters.
-   **Diagnostics**: Real-time error reporting for:
    -   Unknown transforms/functions.
    -   Unterminated strings.
    -   Parser errors.

## ℹ️ Completion Behavior
-   **Sounds**: Inside `s("...")`, completions are filtered. You often need to type at least one character (e.g., `k`) to see relevant sounds like `kick` or `kalimba` to avoid overwhelming the list.
-   **Ranking**: Single-letter functions (e.g., `s`) are prioritized at the top of the list.
-   **Aliases**: Canonical names are preferred; aliases are shown with lower priority.

## 📦 Installation

### Global Install (NPM)
Prerequisite: Node.js >= 18.

```bash
npm i -g @strudel-tools/strudel-ls
```

This exposes the `strudel-ls` binary.

## 🚀 Neovim Integration

The best way to use `strudel-ls` is with **[strudel.nvim](https://github.com/gruvw/strudel.nvim)**, which handles filetypes and evaluation.

### Recommended Configuration (Lazy.nvim)

This setup ensures you have:
1.  **Treesitter** grammar (for syntax highlighting).
2.  **LSP** attachment (for intelligence).
3.  **Strudel.nvim** (for execution).

```lua
return {
  -- 1. Syntax Highlighting (Treesitter)
  {
    "nvim-treesitter/nvim-treesitter",
    opts = function(_, opts)
      -- Register the Strudel parser
      local parser_config = require("nvim-treesitter.parsers").get_parser_configs()
      parser_config.strudel = {
        install_info = {
          -- using joshuadanpeterson fork for latest fixes
          url = "https://github.com/joshuadanpeterson/tree-sitter-strdl",
          files = { "src/parser.c" },
          branch = "main",
        },
        filetype = "strudel",
      }
      vim.list_extend(opts.ensure_installed or {}, { "strudel" })
    end,
  },

  -- 2. Language Server (LSPConfig)
  {
    "neovim/nvim-lspconfig",
    config = function()
      local lspconfig = require("lspconfig")
      local configs = require("lspconfig.configs")

      -- Define strudel_ls if not in upstream lspconfig yet
      if not configs.strudel_ls then
        configs.strudel_ls = {
          default_config = {
            cmd = { "strudel-ls", "--stdio" },
            filetypes = { "strudel", "strdl", "str" },
            root_dir = lspconfig.util.root_pattern(".git", "package.json"),
            settings = {
              strudel = {
                diagnostics = { enable = true },
                completions = { snippets = true, maxItems = 50 },
                formatting = { enable = true },
              },
            },
          },
        }
      end

      lspconfig.strudel_ls.setup({})
    end,
  },

  -- 3. Strudel Plugin (Execution)
  { "gruvw/strudel.nvim" },
}
```

### Filetype Detection
If files are not detected as `strudel` automatically:

```lua
vim.filetype.add({
  extension = {
    strudel = "strudel",
    strdl = "strudel",
    str = "strudel",
  },
})
```

## 🆚 VS Code Setup

Associate extensions with the Strudel language in your `settings.json`:

```jsonc
{
  "files.associations": {
    "*.strudel": "strudel",
    "*.strdl": "strudel",
    "*.str": "strudel"
  }
}
```

## ⚙️ Configuration

You can configure the LSP settings in your client (e.g., `settings.strudel` in `lspconfig` or `.vscode/settings.json`).

| Setting | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `diagnostics.enable` | boolean | `true` | Enable diagnostic reporting. |
| `diagnostics.unknownTransform` | "error" \| "warning" \| "ignore" | `"warning"` | Severity for unknown transforms. |
| `completions.snippets` | boolean | `true` | Enable snippet expansion in completions. |
| `completions.maxItems` | number | `50` | Max number of completion items to return. |
| `formatting.enable` | boolean | `true` | Enable document formatting. |
| `formatting.lineWidth` | number | `100` | Max line width for wrapping. |

## 💻 Development

### Build & Run Locally

```bash
# Install dependencies
npm install

# Build the server
npm run build

# Run tests
npm test

# Watch mode (builds on change)
npm run watch
```

### Regenerating Data
The LSP uses bundled data for sounds and builtins. To regenerate this from a local Strudel clone:

```bash
export STRUDEL_REPO=/path/to/strudel
npm run build:data
```

### Architecture
-   **Server**: `src/server.ts` (LSP connection management).
-   **Analyzer**: `src/analyzer/` (Tree-sitter parsing, traversing, and logic).
-   **Providers**: `src/providers/` (Individual feature implementations).
-   **Data**: `src/data/` (Generated JSON models of Strudel's standard library).

## 📄 License

MIT
