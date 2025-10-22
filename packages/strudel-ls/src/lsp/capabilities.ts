import type { InitializeResult, ServerCapabilities } from 'vscode-languageserver';

export function getServerCapabilities(): ServerCapabilities {
  return {
    textDocumentSync: 2, // Incremental
    completionProvider: {
      // Include common characters users type in Strudel contexts to eagerly surface items
      // - quotes (single/double) for s("…")/s('…') sound names
      // - pipe and greater-than for combinators like |> and |+ etc.
      // - paren/comma/colon for function calls and key-value style args
      triggerCharacters: [' ', '"', "'", '(', ',', ':', '|', '>'],
      resolveProvider: true,
    },
    hoverProvider: true,
    signatureHelpProvider: { triggerCharacters: ['(', ','] },
    definitionProvider: true,
    referencesProvider: true,
    renameProvider: { prepareProvider: false },
    documentSymbolProvider: true,
    codeActionProvider: { codeActionKinds: ['quickfix', 'refactor.rewrite'] },
    documentFormattingProvider: true,
  } as ServerCapabilities;
}

export function makeInitializeResult(): InitializeResult {
  return { capabilities: getServerCapabilities() } as InitializeResult;
}
