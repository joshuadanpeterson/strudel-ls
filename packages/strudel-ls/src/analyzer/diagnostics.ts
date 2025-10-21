import type { Diagnostic, DiagnosticSeverity, Range } from 'vscode-languageserver';
import { DiagnosticSeverity as LspSeverity } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import type { Builtin } from '../data/types';

export interface ServerSettings {
  diagnostics: {
    enable: boolean;
    unknownTransform: 'error' | 'warning' | 'info' | 'hint';
    unknownParameter?: 'error' | 'warning' | 'info' | 'hint';
    miniNotation?: 'error' | 'warning' | 'info' | 'hint';
  };
  completions: { snippets: boolean; builtinsOnly: boolean; maxItems: number };
  formatting: { enable: boolean; lineWidth: number };
  semanticTokens?: { enable: boolean };
  telemetry?: { enable: boolean };
}

const SeverityByName: Record<string, DiagnosticSeverity> = {
  error: LspSeverity.Error,
  warning: LspSeverity.Warning,
  info: LspSeverity.Information,
  hint: LspSeverity.Hint,
} as any;

function findCalls(doc: TextDocument): { name: string; range: Range }[] {
  const text = doc.getText();
  const re = /([A-Za-z_][A-Za-z0-9_]*)\s*\(/g;
  const out: { name: string; range: Range }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const name = m[1];
    const start = m.index;
    const end = start + name.length;
    out.push({ name, range: { start: doc.positionAt(start), end: doc.positionAt(end) } });
  }
  return out;
}

export function computeDiagnostics(
  doc: TextDocument,
  builtins: Map<string, Builtin>,
  settings: ServerSettings,
): Diagnostic[] {
  if (!settings?.diagnostics?.enable) return [];
  const diags: Diagnostic[] = [];

  // Unknown transforms/functions
  const sev = SeverityByName[settings.diagnostics.unknownTransform] ?? LspSeverity.Warning;
  for (const call of findCalls(doc)) {
    if (!builtins.has(call.name)) {
      diags.push({
        range: call.range,
        message: `Unknown transform: ${call.name}`,
        severity: sev,
        source: 'strudel-ls',
        code: 'strudel.unknownTransform',
      });
    }
  }

  // Basic unmatched double-quote check
  const text = doc.getText();
  const dq = (text.match(/\"/g) || []).length;
  if (dq % 2 === 1) {
    const last = text.lastIndexOf('"');
    const start = Math.max(0, last - 1);
    diags.push({
      range: { start: doc.positionAt(start), end: doc.positionAt(last + 1) },
      message: 'Unterminated string literal',
      severity: LspSeverity.Error,
      source: 'strudel-ls',
      code: 'strudel.parse',
    });
  }

  return diags;
}