import type { CompletionItem, Position } from 'vscode-languageserver';
import { CompletionItemKind, InsertTextFormat } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getWordAtPosition } from '../analyzer/utils';
import type { Builtin } from '../data/types';
import soundsData from '../data/sounds.json' assert { type: 'json' };

function isInsideSoundCall(doc: TextDocument, position: Position): boolean {
  const text = doc.getText();
  const offset = doc.offsetAt(position);
  const before = text.slice(0, offset);
  // heuristics: last unmatched s(" or sound(") pattern
  return /(?:^|[^A-Za-z0-9_])(s|sound)\s*\(\s*["'][^"']*$/.test(before);
}

function buildSnippet(name: string, signature?: string): string {
  if (!signature || !signature.includes('(')) return name;
  const paramsPart = signature.match(/\((.*)\)/)?.[1] ?? '';
  const params = paramsPart.split(',').map((p) => p.trim()).filter(Boolean);
  if (params.length === 0) return `${name}($1)`; // best-effort
  const snips = params.map((p, i) => `\${${i + 1}:${p}}`).join(', ');
  return `${name}(${snips})`;
}

function buildMarkdownDoc(b: Builtin): string {
  const parts: string[] = [];
  if (b.blurb) parts.push(b.blurb);
  if (b.example) parts.push(`\n\n\`\`\`strudel\n${b.example}\n\`\`\``);
  if (b.aliasOf) parts.push(`\n\nAlias of: \`${b.aliasOf}\``);
  else if (b.synonyms && b.synonyms.length) parts.push(`\n\nAliases: ${b.synonyms.join(', ')}`);
  return parts.join('');
}

export function provideCompletions(
  doc: TextDocument,
  position: Position,
  builtins: Map<string, Builtin>,
  snippets = true,
  maxItems = 50,
): CompletionItem[] {
  const prefixRaw = getWordAtPosition(doc, position) || '';
  const prefix = prefixRaw.toLowerCase();

  // Context-aware: inside s("...") suggest sounds
  if (isInsideSoundCall(doc, position)) {
    // Require at least one typed character to avoid flooding suggestions
    if (!prefix || prefix.length < 1) return [];
    const items: CompletionItem[] = [];
    const list = (soundsData as any).sounds as string[];
    const meta = (soundsData as any).meta || {};

    function soundDoc(name: string): string | undefined {
      const m = meta[name] || {};
      const parts: string[] = [];
      const sectionLines: string[] = [];
      // If we have a synthesized description (shown in detail), avoid repeating it here; keep only Tags and Aliases
      if (m.desc) {
        const tags  = Array.isArray(m.tags)  && m.tags.length  ? `Tags: ${m.tags.join(', ')}`   : '';
        const aliases = Array.isArray(m.aliases) && m.aliases.length ? `Aliases: ${m.aliases.join(', ')}` : '';
        for (const l of [tags, aliases]) if (l) sectionLines.push(l);
      } else {
        const banks = Array.isArray(m.banks) && m.banks.length ? `Banks: ${m.banks.join(', ')}` : '';
        const packs = Array.isArray(m.packs) && m.packs.length ? `Packs: ${m.packs.join(', ')}` : '';
        const category = m.category ? `Category: ${m.category}${m.family ? ` (${m.family})` : ''}` : '';
        const count = typeof m.count === 'number' ? `Samples: ${m.count}` : '';
        const tags  = Array.isArray(m.tags)  && m.tags.length  ? `Tags: ${m.tags.join(', ')}`   : '';
        const aliases = Array.isArray(m.aliases) && m.aliases.length ? `Aliases: ${m.aliases.join(', ')}` : '';
        for (const l of [category, banks, packs, count, tags, aliases]) if (l) sectionLines.push(l);
      }

      if (sectionLines.length) {
        if (parts.length) parts.push(''); // blank line between desc and sections
        parts.push(sectionLines.join('\n'));
      }
      return parts.length ? parts.join('\n') : undefined;
    }

    for (const s of list) {
      if (!s.toLowerCase().startsWith(prefix)) continue;
      const docStr = soundDoc(s);
      items.push({
        label: s,
        kind: CompletionItemKind.Constant,
        insertText: s,
        insertTextFormat: InsertTextFormat.Snippet,
        sortText: s,
        detail: (() => {
          const m = meta[s] || {};
          if (typeof m.desc === 'string' && m.desc.length > 0) {
            const d = m.desc as string;
            return d.length > 80 ? d.slice(0, 79) + '…' : d;
          }
          // fallback minimal summary
          if (m.category) return m.category as string;
          return undefined;
        })(),
        documentation: docStr ? { kind: 'markdown', value: docStr } as any : undefined,
      });
      // Do not cap sound results; return all prefix matches
    }
    return items;
  }

  // Elsewhere: suggest transforms/functions from builtins
  const items: CompletionItem[] = [];
  for (const [name, b] of builtins) {
    if (prefix && !name.toLowerCase().startsWith(prefix)) continue;
    const kindMap: Record<string, number> = {
      function: CompletionItemKind.Function,
      transform: CompletionItemKind.Function,
      combinator: CompletionItemKind.Function,
      other: CompletionItemKind.Text,
    };
    const item: CompletionItem = {
      label: name,
      kind: (kindMap as any)[b.kind] ?? CompletionItemKind.Text,
      detail: b.signature,
      documentation: { kind: 'markdown', value: buildMarkdownDoc(b) },
      sortText: name,
    };
    if (snippets) {
      item.insertTextFormat = InsertTextFormat.Snippet;
      item.insertText = buildSnippet(name, b.signature);
    }
    items.push(item);
    if (items.length >= maxItems) break;
  }
  return items;
}
