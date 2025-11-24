import type { CodeAction, CodeActionParams } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import type { Builtin } from '../data/types';

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

export function provideCodeActions(
  params: CodeActionParams,
  doc: TextDocument,
  builtins: Map<string, Builtin>,
): CodeAction[] {
  const actions: CodeAction[] = [];
  for (const d of params.context.diagnostics ?? []) {
    if (d.code === 'strudel.unknownTransform') {
      const name = doc.getText(d.range);
      let best: { name: string; dist: number } | null = null;
      for (const k of builtins.keys()) {
        const dist = levenshtein(name, k);
        if (!best || dist < best.dist) best = { name: k, dist };
      }
      if (best) {
        actions.push({
          title: `Replace with "${best.name}"`,
          kind: 'quickfix',
          diagnostics: [d],
          edit: { changes: { [doc.uri]: [{ range: d.range, newText: best.name }] } },
        });
      }
    }
  }
  return actions;
}

function getRefactorActions(doc: TextDocument, range: import('vscode-languageserver').Range): CodeAction[] {
  const text = doc.getText(range);
  if (!text.trim()) return [];

  const wrappers = ['fast', 'slow', 'jux', 'stack', 'every'];
  const actions: CodeAction[] = [];

  for (const w of wrappers) {
    actions.push({
      title: `Wrap with "${w}"`,
      kind: 'refactor.rewrite',
      edit: {
        changes: {
          [doc.uri]: [
            {
              range: range,
              newText: `${w}(${text})`,
            },
          ],
        },
      },
    });
  }

  return actions;
}
