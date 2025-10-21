-- Minimal Neovim init for e2e tests
-- Prefer vendored plugins checked into test/e2e/vendor by CI
local script = debug.getinfo(1, 'S').source:sub(2)
local base_dir = vim.fn.fnamemodify(script, ':h')
-- Reset runtimepath and packpath to minimize user config influence
if vim.env.VIMRUNTIME then
  vim.o.runtimepath = vim.env.VIMRUNTIME
end
vim.o.packpath = ""
local vendor_plenary = base_dir .. '/vendor/plenary.nvim'
if vim.loop.fs_stat(vendor_plenary) then
  vim.opt.runtimepath:append(vendor_plenary)
else
  -- Fallback to standard data path if user has plenary installed via a manager
  vim.opt.runtimepath:append(vim.fn.stdpath('data') .. '/site/pack/packer/start/plenary.nvim')
end

-- Require plenary for busted harness; skip if unavailable
_G.__STRUDEL_E2E_SKIP__ = false
local ok = pcall(require, 'plenary')
if not ok then
  vim.notify('plenary.nvim not found; e2e tests will be skipped', vim.log.levels.WARN)
  _G.__STRUDEL_E2E_SKIP__ = true
end

-- Helper to find local server binary (dist/server.js)
_G.__STRUDEL_LS_CMD__ = (function()
  local cwd = vim.loop.cwd()
  local path = cwd .. '/dist/server.js'
  local stat = vim.loop.fs_stat(path)
  if stat then
    return { 'node', path, '--stdio' }
  end
  return nil
end)()
