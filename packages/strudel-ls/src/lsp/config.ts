import { DiagnosticSeverity } from 'vscode-languageserver';

export const DiagnosticSeverityByName: Record<string, DiagnosticSeverity> = {
  error: DiagnosticSeverity.Error,
  warning: DiagnosticSeverity.Warning,
  info: DiagnosticSeverity.Information,
  hint: DiagnosticSeverity.Hint,
};

export const DefaultSettings = {
  diagnostics: {
    enable: true,
    unknownTransform: 'warning',
    unknownParameter: 'warning',
    miniNotation: 'info',
  },
  completions: {
    snippets: true,
    builtinsOnly: true,
    maxItems: 50,
  },
  formatting: {
    enable: true,
    lineWidth: 100,
  },
  semanticTokens: { enable: false },
  telemetry: { enable: false },
} as const;

export const SUPPORTED_LANGUAGE_IDS = new Set(['strudel', 'strdl', 'str', 'std']);
export const SUPPORTED_EXTENSIONS = new Set(['.strudel', '.strdl', '.str', '.std']);