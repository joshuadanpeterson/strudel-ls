import type { InitializeResult, ServerCapabilities } from 'vscode-languageserver';

export function getServerCapabilities(): ServerCapabilities {
  return {
    textDocumentSync: 2, // Incremental
    completionProvider: {
      triggerCharacters: [' ', '"', '(', ',', ':'],
      resolveProvider: false,
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