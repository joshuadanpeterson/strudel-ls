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

function isInsideBankArg(doc: TextDocument, position: Position): boolean {
  const text = doc.getText();
  const offset = doc.offsetAt(position);
  const before = text.slice(0, offset);
  // Consider inside bank if we're after ".bank(" and before its closing ")" (quotes optional)
  return /\.bank\s*\([^)]*$/.test(before);
}

function getNearestSound(doc: TextDocument, position: Position): string | undefined {
  const textBefore = doc.getText().slice(0, doc.offsetAt(position));
  const re = /(s|sound)\s*\(\s*['"]([^'"\)]+)['"]/g;
  let m: RegExpExecArray | null;
  let last: string | undefined;
  while ((m = re.exec(textBefore))) last = m[2];
  if (!last) return undefined;
  // Heuristic: take the last token-like segment
  const parts = last.trim().split(/[^A-Za-z0-9_]+/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : undefined;
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
  if (b.params && b.params.length) {
    parts.push('\n\nParameters:\n');
    for (const p of b.params) {
      const line = `- \`${p.name}\`${p.type ? `: ${p.type}` : ''}${p.optional ? ' (optional)' : ''}${p.doc ? ` — ${p.doc}` : ''}`;
      parts.push(line);
    }
  }
  if (b.enums && b.enums.length) {
    parts.push('\n\nChoices:\n');
    parts.push(b.enums.map((e: string) => `- \`${e}\``).join('\n'));
  }
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

  // Context-aware: inside bank("...") suggest banks available for the nearest sound
  if (isInsideBankArg(doc, position)) {
    const meta = (soundsData as any).meta || {};
    const sound = getNearestSound(doc, position);
    const info = sound ? (meta as any)[sound] || {} : {};
    let banks: string[] = Array.isArray(info.banks) ? info.banks : [];
    if (!banks.length) {
      // Fallback: union of all banks (unique)
      const set = new Set<string>();
      for (const k of Object.keys(meta)) {
        const bs = (meta as any)[k]?.banks as string[] | undefined;
        if (Array.isArray(bs)) for (const b of bs) set.add(b);
      }
      banks = Array.from(set).sort();
    }
    const items: CompletionItem[] = [];
    const lcPrefix = prefix.toLowerCase();
    for (const b of banks) {
      if (lcPrefix && !b.toLowerCase().startsWith(lcPrefix)) continue;
      items.push({
        label: b,
        kind: CompletionItemKind.EnumMember,
        insertText: b,
        insertTextFormat: InsertTextFormat.Snippet,
        sortText: b,
        detail: `Bank for ${sound}`,
        documentation: info.baseUrls?.length ? { kind: 'markdown', value: `Source: ${info.baseUrls[0]}` } as any : undefined,
      });
    }
    return items;
  }

  // Context-aware: inside s("...") suggest sounds
  if (isInsideSoundCall(doc, position)) {
    // Allow empty prefix (e.g. inside "") to suggest all sounds
    let items: CompletionItem[] = [];
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
        // Optional source line (first pack + base URL if available)
        const source = (() => {
          const pack = Array.isArray(m.packs) && m.packs[0];
          const url = Array.isArray(m.baseUrls) && m.baseUrls[0];
          if (pack && url) return `Source: [${pack}](${url})`;
          if (pack) return `Source: ${pack}`;
          return '';
        })();
        for (const l of [source, tags, aliases]) if (l) sectionLines.push(l);
      } else {
        const banks = Array.isArray(m.banks) && m.banks.length ? `Banks: ${m.banks.join(', ')}` : '';
        const packs = Array.isArray(m.packs) && m.packs.length ? `Packs: ${m.packs.join(', ')}` : '';
        const category = m.category ? `Category: ${m.category}${m.family ? ` (${m.family})` : ''}` : '';
        const count = typeof m.count === 'number' ? `Samples: ${m.count}` : '';
        const tags  = Array.isArray(m.tags)  && m.tags.length  ? `Tags: ${m.tags.join(', ')}`   : '';
        const aliases = Array.isArray(m.aliases) && m.aliases.length ? `Aliases: ${m.aliases.join(', ')}` : '';
        // Optional source line (first pack + base URL if available)
        const source = (() => {
          const pack = Array.isArray(m.packs) && m.packs[0];
          const url = Array.isArray(m.baseUrls) && m.baseUrls[0];
          if (pack && url) return `Source: [${pack}](${url})`;
          if (pack) return `Source: ${pack}`;
          return '';
        })();
        for (const l of [category, banks, packs, count, source, tags, aliases]) if (l) sectionLines.push(l);
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
      const m = (meta as any)[s] || {};
      items.push({
        label: s,
        kind: CompletionItemKind.Constant,
        insertText: s,
        insertTextFormat: InsertTextFormat.Snippet,
        sortText: `${m.category ? m.category + '~' : ''}${s}`,
        detail: (() => {
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
    // Fuzzy fallback if no prefix matches
    if (items.length === 0) {
      function subseqScore(name: string, q: string): number | null {
        let i = 0, j = 0, gaps = 0;
        const n = name.toLowerCase(), qq = q.toLowerCase();
        while (i < n.length && j < qq.length) {
          if (n[i] === qq[j]) { i++; j++; } else { i++; gaps++; }
        }
        if (j < qq.length) return null;
        return gaps + (n.length - qq.length); // lower is better
      }
      const scored: Array<{ s: string; score: number }> = [];
      for (const s of list) {
        const sc = subseqScore(s, prefix);
        if (sc !== null) scored.push({ s, score: sc });
      }
      scored.sort((a, b) => a.score - b.score || a.s.localeCompare(b.s));
      for (const { s } of scored.slice(0, Math.min(20, maxItems))) {
        const docStr = soundDoc(s);
        const m = (meta as any)[s] || {};
        items.push({
          label: s,
          kind: CompletionItemKind.Constant,
          insertText: s,
          insertTextFormat: InsertTextFormat.Snippet,
          sortText: `${m.category ? m.category + '~' : ''}${s}`,
          detail: (m.category as string) || undefined,
          documentation: docStr ? { kind: 'markdown', value: docStr } as any : undefined,
        });
      }
    }
    return items;
  }

  // Inside function call with known enums: propose enum choices
  {
    const text = doc.getText().slice(0, doc.offsetAt(position));
    const m = /([A-Za-z_][A-Za-z0-9_]*)\s*\([^)]*$/m.exec(text);
    if (m) {
      const fname = m[1];
      const b = builtins.get(fname);
      if (b && b.enums && b.enums.length) {
        const items: CompletionItem[] = [];
        for (const val of b.enums) {
          if (prefix && !val.toLowerCase().startsWith(prefix)) continue;
          items.push({
            label: val,
            kind: CompletionItemKind.EnumMember,
            insertText: val,
            insertTextFormat: InsertTextFormat.Snippet,
            detail: `Choice for ${fname}`,
            sortText: val,
          });
        }
        if (items.length) return items;
      }
      // If we're inside a known function call but there are no enum choices,
      // avoid suggesting unrelated items (keep parens focused on parameters)
      if (b) return [];
    }
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
      sortText: `${b.aliasOf ? 'z~' : 'a~'}${name}`,
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
