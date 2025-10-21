#!/usr/bin/env node
import {
  createConnection,
  ProposedFeatures,
  TextDocuments,
  DidChangeConfigurationNotification,
  CompletionParams,
  HoverParams,
  SignatureHelpParams,
  CodeActionParams,
  InitializeParams,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { makeInitializeResult, getServerCapabilities } from './lsp/capabilities';
import { DefaultSettings, DiagnosticSeverityByName } from './lsp/config';
import { provideCompletions } from './providers/completion';
import { provideHover } from './providers/hover';
import { provideSignatureHelp } from './providers/signature';
import { computeDiagnostics } from './analyzer/diagnostics';
import { provideCodeActions } from './providers/codeActions';
import type { Builtin } from './data/types';
import builtinsData from './data/builtins.json' assert { type: 'json' };

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

let settings = DefaultSettings;

// Load builtins into a Map for quick lookup
const builtins: Map<string, Builtin> = new Map((builtinsData as Builtin[]).map((b) => [b.name, b]));

connection.onInitialize((_params: InitializeParams) => {
  return makeInitializeResult();
});

connection.onInitialized(() => {
  connection.client.register(DidChangeConfigurationNotification.type, undefined);
});

connection.onDidChangeConfiguration((_change) => {
  // For now, keep defaults; could merge user settings here
  settings = DefaultSettings;
  // Recompute diagnostics for all open docs
  for (const doc of documents.all()) {
    validateTextDocument(doc);
  }
});

async function validateTextDocument(doc: TextDocument) {
  const diags = computeDiagnostics(doc, builtins, settings as any);
  connection.sendDiagnostics({ uri: doc.uri, diagnostics: diags });
}

documents.onDidChangeContent((change) => {
  validateTextDocument(change.document);
});

connection.onCompletion((params: CompletionParams) => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return [];
  return provideCompletions(
    doc,
    params.position,
    builtins,
    settings.completions.snippets,
    settings.completions.maxItems,
  );
});

connection.onHover((params: HoverParams) => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return null;
  return provideHover(doc, params.position, builtins);
});

connection.onSignatureHelp((params: SignatureHelpParams) => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return null;
  return provideSignatureHelp(doc, params.position, builtins);
});

connection.onCodeAction((params: CodeActionParams) => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return [];
  return provideCodeActions(params, doc, builtins);
});

connection.onShutdown(() => {
  // no-op
});

// Make the text document manager listen on the connection
// for open, change and close text document events

documents.listen(connection);
connection.listen();