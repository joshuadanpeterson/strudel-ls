import type { Hover, Position } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import type { Builtin } from '../data/types';
import { getWordRangeAtPosition } from '../analyzer/utils';
import soundsData from '../data/sounds.json' assert { type: 'json' };

function isInsideSoundCall(doc: TextDocument, position: Position): boolean {
  const text = doc.getText();
  const offset = doc.offsetAt(position);
  const before = text.slice(0, offset);
  return /(?:^|[^A-Za-z0-9_])(s|sound)\s*\(\s*["'][^"']*$/.test(before);
}

export function provideHover(
  doc: TextDocument,
  position: Position,
  builtins: Map<string, Builtin>,
): Hover | null {
  const range = getWordRangeAtPosition(doc, position);
  if (!range) return null;
  const word = doc.getText(range);

  // 1) Builtin hover (existing behavior)
  const b = builtins.get(word);
  if (b) {
    const mdParts: string[] = [];
    mdParts.push(b.signature ? `\`\`${b.signature}\`\`` : `\`\`${b.name}\`\``);
    if (b.blurb) mdParts.push(`\n\n${b.blurb}`);
    if (b.example) mdParts.push(`\n\nExample:\n\n\`\`\`strudel\n${b.example}\n\`\`\``);
    if (b.aliasOf) {
      mdParts.push(`\n\nAlias of: \`${b.aliasOf}\``);
    } else if (b.synonyms && b.synonyms.length) {
      mdParts.push(`\n\nAliases: ${b.synonyms.join(', ')}`);
    }
    return { contents: { kind: 'markdown', value: mdParts.join('') }, range };
  }

  // 2) Sound-name hover when inside s("…") or sound("…")
  if (isInsideSoundCall(doc, position)) {
    const meta = (soundsData as any).meta || {};
    const m = meta[word];
    if (m) {
      const parts: string[] = [];
      if (m.desc) parts.push(m.desc);
      const lines: string[] = [];
      if (m.desc) {
        // With desc present, avoid repeating; show only Source, Tags and Aliases
        const pack = Array.isArray(m.packs) && m.packs[0];
        const url = Array.isArray(m.baseUrls) && m.baseUrls[0];
        if (pack && url) lines.push(`Source: [${pack}](${url})`);
        else if (pack) lines.push(`Source: ${pack}`);
        if (Array.isArray(m.tags) && m.tags.length) lines.push(`Tags: ${m.tags.join(', ')}`);
        if (Array.isArray(m.aliases) && m.aliases.length) lines.push(`Aliases: ${m.aliases.join(', ')}`);
      } else {
        if (m.category) lines.push(`Category: ${m.category}${m.family ? ` (${m.family})` : ''}`);
        if (Array.isArray(m.banks) && m.banks.length) lines.push(`Banks: ${m.banks.join(', ')}`);
        if (Array.isArray(m.packs) && m.packs.length) lines.push(`Packs: ${m.packs.join(', ')}`);
        const pack = Array.isArray(m.packs) && m.packs[0];
        const url = Array.isArray(m.baseUrls) && m.baseUrls[0];
        if (pack && url) lines.push(`Source: [${pack}](${url})`);
        if (typeof m.count === 'number') lines.push(`Samples: ${m.count}`);
        if (Array.isArray(m.tags) && m.tags.length) lines.push(`Tags: ${m.tags.join(', ')}`);
        if (Array.isArray(m.aliases) && m.aliases.length) lines.push(`Aliases: ${m.aliases.join(', ')}`);
      }
      if (lines.length) {
        if (parts.length) parts.push('');
        parts.push(lines.join('\n'));
      }
      if (parts.length) return { contents: { kind: 'markdown', value: parts.join('\n') }, range };
    }
  }

  return null;
}
