local busted = require('plenary.busted')

if _G.__STRUDEL_E2E_SKIP__ then
  describe('strudel-ls e2e', function()
    it('skipped (missing dependencies)', function()
      assert(true)
    end)
  end)
  return
end

local cmd = _G.__STRUDEL_LS_CMD__

describe('strudel-ls e2e', function()
  it('attaches to buffer with filetype=strdl', function()
    if not cmd then
      pending('dist/server.js not built; run `npm run build` first')
    end
    vim.cmd('enew')
    vim.bo.filetype = 'strdl'
    local client_id = vim.lsp.start({ cmd = cmd, name = 'strudel_ls', root_dir = vim.loop.cwd(), settings = {} })
    assert.is_truthy(client_id)
    -- simple wait for client attach
    vim.wait(2000, function()
      local clients = vim.lsp.get_clients({ bufnr = 0 })
      return #clients > 0
    end)
    local clients = vim.lsp.get_clients({ bufnr = 0 })
    assert.is_true(#clients > 0)
  end)
end)