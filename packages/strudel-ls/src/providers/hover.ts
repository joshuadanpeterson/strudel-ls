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

function isInsideBankArg(doc: TextDocument, position: Position): boolean {
  const text = doc.getText();
  const offset = doc.offsetAt(position);
  const before = text.slice(0, offset);
  return /\.bank\s*\(\s*["'][^"']*$/.test(before);
}

function getNearestSound(doc: TextDocument, position: Position): string | undefined {
  const textBefore = doc.getText().slice(0, doc.offsetAt(position));
  const re = /(s|sound)\s*\(\s*['"]([^'"\)]+)['"]/g;
  let m: RegExpExecArray | null;
  let last: string | undefined;
  while ((m = re.exec(textBefore))) last = m[2];
  if (!last) return undefined;
  const parts = last.trim().split(/[^A-Za-z0-9_]+/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : undefined;
}

function buildFnHover(b: Builtin): string | undefined {
  const parts: string[] = [];
  parts.push(b.signature ? `\`\`${b.signature}\`\`` : `\`\`${b.name}\`\``);
  if (b.blurb) parts.push(`\n\n${b.blurb}`);
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
  if (b.example) parts.push(`\n\nExample:\n\n\`\`\`strudel\n${b.example}\n\`\`\``);
  if (b.aliasOf) {
    parts.push(`\n\nAlias of: \`${b.aliasOf}\``);
  } else if (b.synonyms && b.synonyms.length) {
    parts.push(`\n\nAliases: ${b.synonyms.join(', ')}`);
  }
  return parts.join('');
}

export function provideHover(
  doc: TextDocument,
  position: Position,
  builtins: Map<string, Builtin>,
): Hover | null {
  const range = getWordRangeAtPosition(doc, position);
  if (!range) return null;
  const word = doc.getText(range);

  // 1) Builtin hover (enhanced)
  const b = builtins.get(word);
  if (b) {
    const val = buildFnHover(b);
    if (val) return { contents: { kind: 'markdown', value: val }, range };
  }

  // 2) bank("…") hover: list available banks for the nearest sound
  if (isInsideBankArg(doc, position)) {
    const meta = (soundsData as any).meta || {};
    const sound = getNearestSound(doc, position);
    if (sound) {
      const info = (meta as any)[sound] || {};
      const banks: string[] = Array.isArray(info.banks) ? info.banks : [];
      if (banks.length) {
        const list = banks.map((b: string) => `- ${b}`).join('\n');
        const header = `Banks for \`${sound}\`:`;
        return { contents: { kind: 'markdown', value: `${header}\n\n${list}` }, range };
      }
    }
  }

  // 3) Sound-name hover when inside s("…") or sound("…")
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

  // 4) Function call hover: show parameter docs and choices for the called function
  {
    const text = doc.getText().slice(0, doc.offsetAt(position));
    const m = /([A-Za-z_][A-Za-z0-9_]*)\s*\([^)]*$/m.exec(text);
    if (m) {
      const fname = m[1];
      const b = builtins.get(fname);
      if (b) {
        const val = buildFnHover(b);
        if (val) return { contents: { kind: 'markdown', value: val }, range };
      }
    }
  }

  return null;
}
