return {
  default_config = {
    cmd = { "strudel-ls", "--stdio" },
    filetypes = { "strudel", "strdl", "str" },
    root_dir = function(fname)
      return vim.fn.getcwd()
    end,
    settings = {},
  },
  docs = {
    description = [[ Language Server for Strudel pattern files. ]],
  },
}