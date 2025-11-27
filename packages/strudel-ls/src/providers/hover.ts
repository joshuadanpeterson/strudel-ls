import type { Hover, Position } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import type { Builtin } from '../data/types';
import { getWordRangeAtPosition } from '../analyzer/utils';
import soundsData from '../data/sounds.json' assert { type: 'json' };
import { SoundDescriptions, BankDescriptions } from '../data/descriptions';

function isInsideString(doc: TextDocument, position: Position): boolean {
  const text = doc.getText();
  const offset = doc.offsetAt(position);
  const before = text.slice(0, offset);
  const after = text.slice(offset);
  
  const lastDouble = before.lastIndexOf('"');
  const lastSingle = before.lastIndexOf("'");
  
  const lastQuoteIndex = Math.max(lastDouble, lastSingle);
  if (lastQuoteIndex === -1) return false;
  
  const quoteChar = before[lastQuoteIndex];
  const segment = before.slice(lastQuoteIndex + 1);
  if (segment.includes(quoteChar)) {
     return false; // Closed before
  }
  
  if (!after.includes(quoteChar)) return false;
  
  return true;
}

function isInsideBankArg(doc: TextDocument, position: Position): boolean {
  const text = doc.getText();
  const offset = doc.offsetAt(position);
  const before = text.slice(0, offset);
  return /\.bank\s*\([^)]*$/.test(before);
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

  // 2) Check if word is a Bank or Sound inside ANY string literal
  // (Relaxed from previous strict isInsideBankArg check)
  // We only do this if it matches a known Bank or Sound to avoid noise.
  
  // Check for Bank
  // If hovering a specific bank name, show which sounds use it
  // WE ONLY DO THIS if it's actually inside a string OR a bank arg
  // Relaxed logic: checking isInsideString OR isInsideBankArg
  // But we MUST verify it is one of those. If it's just code (e.g. variable name), we skip.
  
  const inString = isInsideString(doc, position) || isInsideBankArg(doc, position);
  
  if (word && inString) {
      const meta = (soundsData as any).meta || {};
      let canonicalName = word;
      let foundBank = false;

      // Check if it is a known bank
      // Optimization: Check if word matches a known bank in BankDescriptions directly first?
      // Or check against the meta list.
      
      // 1. Direct BankDescriptions lookup (fastest)
      // 2. Scan meta for bank existence (slower but complete)
      
      // Let's try to find it in meta first, as before, to gather usage info.
      const usedBy: string[] = [];
      const categories = new Set<string>();
      
      for (const k of Object.keys(meta)) {
        const m = (meta as any)[k];
        const bs = m?.banks;
        if (Array.isArray(bs)) {
           const match = bs.find((b: string) => b.toLowerCase() === word.toLowerCase());
           if (match) {
             usedBy.push(k);
             if (m.category) categories.add(m.category);
             canonicalName = match;
             foundBank = true;
           }
        }
      }
      
      if (foundBank && usedBy.length > 0) {
        usedBy.sort();
        const priority = ['kick drum', 'snare drum', 'hi-hat', 'piano', 'bass', 'synth', 'percussion'];
        const sortedCats = Array.from(categories).sort((a, b) => {
           const pa = priority.findIndex(p => a.toLowerCase().includes(p));
           const pb = priority.findIndex(p => b.toLowerCase().includes(p));
           if (pa > -1 && pb > -1) return pa - pb;
           if (pa > -1) return -1;
           if (pb > -1) return 1;
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

        const humanName = canonicalName.replace(/([A-Z]+)/g, ' $1').trim().replace(/([0-9]+)/g, ' $1').trim();
        let bankDesc = BankDescriptions[canonicalName];

        if (!bankDesc) {
           bankDesc = BankDescriptions[canonicalName];
           if (!bankDesc) {
             const key = Object.keys(BankDescriptions).find(k => k.toLowerCase() === canonicalName.toLowerCase());
             if (key) {
               bankDesc = BankDescriptions[key];
               canonicalName = key;
             }
           }
        }

        let content = `**${canonicalName}**\n\n_${humanName}_\n\n`;
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

  // 3) Check for Sound (meta key)
  // We do this if it wasn't a bank.
  if (word && inString) {
    const meta = (soundsData as any).meta || {};
    const m = meta[word]; // Exact match first
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
        if (!manualDesc) {
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
      examples.push(`s("${word}")`);
      if (Array.isArray(m.banks) && m.banks.length > 0) {
        const b = m.banks.find((x: string) => x.includes('909')) || m.banks[0];
        examples.push(`s("${word}").bank("${b}")`);
      }
      const melodicCats = ['piano', 'guitar', 'bass', 'strings', 'winds', 'brass', 'keyboard', 'synth', 'voice'];
      const isMelodic = m.category && melodicCats.some(c => m.category.toLowerCase().includes(c));
      if (isMelodic) {
        examples.push(`note("c3").s("${word}")`);
      }
      
      parts.push('```strudel\n' + examples.join('\n') + '\n```');

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

  // 4) Function call hover (legacy fallback if needed, but builtins check at top covers most)
  {
    const text = doc.getText().slice(0, doc.offsetAt(position));
    const m = /([A-Za-z_][A-Za-z0-9_]*)\s*\([^)]*$/m.exec(text);
    if (m) {
      const fname = m[1];
      // Double check if it wasn't caught by 1) (e.g. inside parens?)
      const b = builtins.get(fname);
      if (b) {
        const val = buildFnHover(b);
        if (val) return { contents: { kind: 'markdown', value: val }, range };
      }
    }
  }

  return null;
}
