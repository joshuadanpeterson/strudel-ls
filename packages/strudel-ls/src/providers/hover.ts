import type { Hover, Position } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import type { Builtin } from '../data/types';
import { getWordRangeAtPosition } from '../analyzer/utils';
import soundsData from '../data/sounds.json' assert { type: 'json' };
import { SoundDescriptions, BankDescriptions } from '../data/descriptions';

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

  // 2) bank("…") hover: list available banks for the nearest sound, or info about hovered bank
  if (isInsideBankArg(doc, position)) {
    const meta = (soundsData as any).meta || {};
    
    // If hovering a specific bank name, show which sounds use it
    if (word) {
      const usedBy: string[] = [];
      const categories = new Set<string>();
      for (const k of Object.keys(meta)) {
        const m = (meta as any)[k];
        const bs = m?.banks;
        if (Array.isArray(bs) && bs.includes(word)) {
           usedBy.push(k);
           if (m.category) categories.add(m.category);
        }
      }
      
      if (usedBy.length > 0) {
        usedBy.sort();
        // Prioritize categories by frequency or importance
        const priority = ['kick drum', 'snare drum', 'hi-hat', 'piano', 'bass', 'synth', 'percussion'];
        const sortedCats = Array.from(categories).sort((a, b) => {
           const pa = priority.findIndex(p => a.toLowerCase().includes(p));
           const pb = priority.findIndex(p => b.toLowerCase().includes(p));
           // If both in priority list, sort by index (lower is better)
           if (pa > -1 && pb > -1) return pa - pb;
           // If one is priority, it comes first
           if (pa > -1) return -1;
           if (pb > -1) return 1;
           // Otherwise alphabetical
           return a.localeCompare(b);
        });
        const catDesc = sortedCats.length > 0 
          ? sortedCats.length > 3 
            ? `${sortedCats.slice(0, 3).join(', ')}...`
            : sortedCats.join(', ')
          : 'various';
        
        const summary = sortedCats.length === 1 
          ? `**${sortedCats[0]}** bank` 
          : `Bank containing **${catDesc}** sounds`;

        // Humanize bank name (e.g. RolandTR909 -> Roland TR 909)
        const humanName = word.replace(/([A-Z]+)/g, ' $1').trim().replace(/([0-9]+)/g, ' $1').trim();
        const bankDesc = BankDescriptions[word];

        let content = `**${word}**\n\n_${humanName}_\n\n`;
        if (bankDesc) content += `${bankDesc}\n\n`;
        content += `${summary}\n\nUsed by **${usedBy.length}** instruments: ${usedBy.slice(0, 10).join(', ')}${usedBy.length > 10 ? ', ...' : ''}`;

        return { 
           contents: { 
             kind: 'markdown', 
             value: content
           }, 
           range 
        };
      }
    }

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
      
      // Title / Category
      const cat = m.category ? m.category.charAt(0).toUpperCase() + m.category.slice(1) : 'Sound';
      const family = m.family ? ` (${m.family})` : '';
      parts.push(`**${word}**`);
      parts.push(`_${cat}${family}_`);

      // Description
      const catName = m.category || 'sound';
      const manualDesc = SoundDescriptions[word];
      
      if (manualDesc) {
        parts.push(manualDesc);
      } else {
        parts.push(`Plays a **${catName}** sample.`);
      }

      if (m.desc) {
        // Only show m.desc if we DON'T have a manual description
        // because m.desc typically contains banks/packs/counts which are already in "Details"
        if (!manualDesc) {
           // Strip the "Category · " prefix if it's redundant
           let d = m.desc;
           if (m.category && d.toLowerCase().startsWith(m.category.toLowerCase())) {
              const idx = d.indexOf('·');
              if (idx > -1) d = d.slice(idx + 1).trim();
           }
           parts.push(d);
        }
      } else if (!manualDesc) {
        parts.push(`Standard **${word}** sound.`);
      }
      parts.push('### Usage');
      const examples: string[] = [];
      // 1. Basic usage
      examples.push(`s("${word}")`);
      // 2. Bank usage if available
      if (Array.isArray(m.banks) && m.banks.length > 0) {
        // Pick a bank (e.g. RolandTR909 or first one)
        const b = m.banks.find((x: string) => x.includes('909')) || m.banks[0];
        examples.push(`s("${word}").bank("${b}")`);
      }
      // 3. Melodic usage heuristic (if not purely drums, or if known melodic category)
      const melodicCats = ['piano', 'guitar', 'bass', 'strings', 'winds', 'brass', 'keyboard', 'synth', 'voice'];
      const isMelodic = m.category && melodicCats.some(c => m.category.toLowerCase().includes(c));
      if (isMelodic) {
        examples.push(`note("c3").s("${word}")`);
      }
      
      parts.push('```strudel\n' + examples.join('\n') + '\n```');

      // Metadata / Details
      const lines: string[] = [];
      if (typeof m.count === 'number') lines.push(`- **Samples**: ${m.count}`);
      if (Array.isArray(m.banks) && m.banks.length) {
         lines.push(`- **Banks**: ${m.banks.length} available (e.g. _${m.banks.slice(0,3).join(', ')}..._)`);
      }
      
      const pack = Array.isArray(m.packs) && m.packs[0];
      const url = Array.isArray(m.baseUrls) && m.baseUrls[0];
      if (pack && url) lines.push(`- **Source**: [${pack}](${url})`);
      else if (pack) lines.push(`- **Source**: ${pack}`);
      
      if (lines.length) {
        parts.push('### Details');
        parts.push(lines.join('\n'));
      }

      return { contents: { kind: 'markdown', value: parts.join('\n\n') }, range };
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
