local Pkg = require "mason-core.package"
local npm = require "mason-core.managers.npm"

return Pkg.new {
  name = "strudel-ls",
  desc = "Language server for Strudel (.str/.std/.strdl/.strudel)",
  homepage = "https://github.com/joshuadanpeterson/strudel-ls",
  languages = { "Strudel" },
  categories = { "LSP" },
  install = function(ctx)
    npm.install(ctx, { "@strudel-tools/strudel-ls", ctx.requested_version or "latest" })
    ctx:link_bin("strudel-ls", ctx:read_node_bin("strudel-ls"))
  end,
}