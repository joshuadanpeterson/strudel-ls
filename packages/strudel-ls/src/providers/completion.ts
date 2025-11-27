import type { CompletionItem, Position } from 'vscode-languageserver';
import { CompletionItemKind, InsertTextFormat } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getWordAtPosition } from '../analyzer/utils';
import type { Builtin } from '../data/types';
import soundsData from '../data/sounds.json' assert { type: 'json' };
import { SoundDescriptions, BankDescriptions } from '../data/descriptions';

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
  
  if (!after.includes(quoteChar)) return false; // Never closed after? (could be mid-typing)
  
  return true;
}

function getNearestSound(doc: TextDocument, position: Position): string | undefined {
  const textBefore = doc.getText().slice(0, doc.offsetAt(position));
  const re = /(s|sound)\s*\(\s*['"]([^'"\)]+)['"]/g;
  let m: RegExpExecArray | null;
  let last: string | undefined;
  while ((m = re.exec(textBefore))) last = m[2];
  if (!last) return undefined;
  
  const parts = last.trim().split(/[^A-Za-z0-9_]+/).filter(Boolean);
  // Prefer a part that exists in the sound library
  const meta = (soundsData as any).meta || {};
  for (const part of parts) {
    if (meta[part]) return part;
  }
  // Fallback to last part if no known sound found (legacy behavior)
  return parts.length ? parts[parts.length - 1] : undefined;
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

  // 1. Context-aware: inside bank("...") suggest banks available for the nearest sound
  if (isInsideBankArg(doc, position)) {
    // ... (keep existing bank logic)
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
    // ...
    const items: CompletionItem[] = [];
    const lcPrefix = prefix.toLowerCase();
    for (const b of banks) {
      if (lcPrefix && !b.toLowerCase().startsWith(lcPrefix)) continue;
      
      // Find sounds that use this bank
      const usedBy: string[] = [];
      const categories = new Set<string>();
      for (const k of Object.keys(meta)) {
         const m = (meta as any)[k];
         const bs = m?.banks;
         if (Array.isArray(bs) && bs.includes(b)) {
           usedBy.push(k);
           if (m.category) categories.add(m.category);
         }
      }
      usedBy.sort();
      
      // Prioritize categories
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
        ? sortedCats.length > 3 ? `${sortedCats.slice(0, 3).join(', ')}...` : sortedCats.join(', ')
        : 'various';
      const summary = sortedCats.length === 1 ? `**${sortedCats[0]}** bank` : `Bank containing **${catDesc}** sounds`;
      
      // Humanize bank name
      const humanName = b.replace(/([A-Z]+)/g, ' $1').trim().replace(/([0-9]+)/g, ' $1').trim();
      const bankDesc = BankDescriptions[b];
      const descPart = bankDesc ? `\n\n${bankDesc}\n\n` : `\n\n`;

      items.push({
        label: b,
        kind: CompletionItemKind.EnumMember,
        insertText: b,
        insertTextFormat: InsertTextFormat.Snippet,
        sortText: b,
        detail: `Bank for ${sound}`,
        documentation: { 
            kind: 'markdown', 
            value: (info.baseUrls?.length ? `Source: ${info.baseUrls[0]}\n\n` : '') + 
                   `_${humanName}_${descPart}` +
                   summary + '\n\n' +
                   (usedBy.length ? `Used by: ${usedBy.join(', ')}` : '')
        } as any,
      });
    }
    return items;
  }

  // 2. Context-aware: inside s("...") suggest sounds
  if (isInsideSoundCall(doc, position)) {
    // ... (keep existing sound logic, effectively blocking generic strings later due to return)
    // Allow empty prefix (e.g. inside "") to suggest all sounds
    let items: CompletionItem[] = [];
    const list = (soundsData as any).sounds as string[];
    const meta = (soundsData as any).meta || {};

    function soundDoc(name: string): string | undefined {
      const m = meta[name] || {};
      const parts: string[] = [];
      
      // Description
      const manualDesc = SoundDescriptions[name];
      if (manualDesc) {
        parts.push(manualDesc);
      } else if (m.desc) {
        // Fallback to auto-desc if no manual one
        let d = m.desc;
        if (m.category && d.toLowerCase().startsWith(m.category.toLowerCase())) {
           const idx = d.indexOf('·');
           if (idx > -1) d = d.slice(idx + 1).trim();
        }
        parts.push(d);
      }

      // Usage
      const examples: string[] = [];
      // Basic
      examples.push(`s("${name}")`);
      // Bank usage if available (show one example)
      if (Array.isArray(m.banks) && m.banks.length > 0) {
        const b = m.banks.find((x: string) => x.includes('909')) || m.banks[0];
        examples.push(`s("${name}").bank("${b}")`);
      }
      // Melodic usage heuristic
      const melodicCats = ['piano', 'guitar', 'bass', 'strings', 'winds', 'brass', 'keyboard', 'synth', 'voice'];
      const isMelodic = m.category && melodicCats.some(c => m.category.toLowerCase().includes(c));
      if (isMelodic) {
        examples.push(`note("c3").s("${name}")`);
      }
      
      if (examples.length) {
        parts.push(`\n\`\`\`strudel\n${examples.join('\n')}\n\`\`\``);
      }

      const sectionLines: string[] = [];
      // Source/Tags
      const tags  = Array.isArray(m.tags)  && m.tags.length  ? `Tags: ${m.tags.join(', ')}`   : '';
      const aliases = Array.isArray(m.aliases) && m.aliases.length ? `Aliases: ${m.aliases.join(', ')}` : '';
      const source = (() => {
          const pack = Array.isArray(m.packs) && m.packs[0];
          const url = Array.isArray(m.baseUrls) && m.baseUrls[0];
          if (pack && url) return `Source: [${pack}](${url})`;
          if (pack) return `Source: ${pack}`;
          return '';
      })();
      
      if (source) sectionLines.push(source);
      if (tags) sectionLines.push(tags);
      if (aliases) sectionLines.push(aliases);

      if (sectionLines.length) {
        parts.push('\n' + sectionLines.join('\n'));
      }
      return parts.length ? parts.join('\n') : undefined;
    }

    // 1. Add Sounds
    for (const s of list) {
      if (!s || (prefix && !s.toLowerCase().startsWith(prefix))) continue;
      const docStr = soundDoc(s);
      const m = (meta as any)[s] || {};
      items.push({
        label: s,
        kind: CompletionItemKind.Constant,
        insertText: s,
        insertTextFormat: InsertTextFormat.Snippet,
        sortText: `0_${m.category ? m.category + '~' : ''}${s}`, // 0_ to prioritize sounds
        detail: (() => {
          if (typeof m.desc === 'string' && m.desc.length > 0) {
            const d = m.desc as string;
            return d.length > 80 ? d.slice(0, 79) + '…' : d;
          }
          if (m.category) return m.category as string;
          return undefined;
        })(),
        documentation: docStr ? { kind: 'markdown', value: docStr } as any : undefined,
      });
    }

    // 2. Add Banks (REMOVED from s(), see previous change)
    // ...

    // Fuzzy fallback if no prefix matches
    if (items.length === 0 && prefix) {
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

  // 3. Inside generic string (e.g. const x = "..."): Suggest BOTH sounds and banks
  if (isInsideString(doc, position)) {
     const items: CompletionItem[] = [];
     const list = (soundsData as any).sounds as string[];
     const meta = (soundsData as any).meta || {};

     // Helper from sound completion (duplicated for now, or hoisted if refactored)
     // To keep diff minimal, I will inline simplified logic or reuse shared functions if I hoist them.
     // I'll hoist `soundDoc` logic conceptually by repeating the loop structure.
     
     function soundDoc(name: string): string | undefined {
      const m = meta[name] || {};
      const parts: string[] = [];
      
      // Description
      const manualDesc = SoundDescriptions[name];
      if (manualDesc) {
        parts.push(manualDesc);
      } else if (m.desc) {
        // Fallback to auto-desc if no manual one
        let d = m.desc;
        if (m.category && d.toLowerCase().startsWith(m.category.toLowerCase())) {
           const idx = d.indexOf('·');
           if (idx > -1) d = d.slice(idx + 1).trim();
        }
        parts.push(d);
      }

      // Usage
      const examples: string[] = [];
      examples.push(`s("${name}")`);
      if (Array.isArray(m.banks) && m.banks.length > 0) {
        const b = m.banks.find((x: string) => x.includes('909')) || m.banks[0];
        examples.push(`s("${name}").bank("${b}")`);
      }
      
      if (examples.length) {
        parts.push(`\n\`\`\`strudel\n${examples.join('\n')}\n\`\`\``);
      }

      const sectionLines: string[] = [];
      const tags  = Array.isArray(m.tags)  && m.tags.length  ? `Tags: ${m.tags.join(', ')}`   : '';
      const aliases = Array.isArray(m.aliases) && m.aliases.length ? `Aliases: ${m.aliases.join(', ')}` : '';
      const source = (() => {
          const pack = Array.isArray(m.packs) && m.packs[0];
          const url = Array.isArray(m.baseUrls) && m.baseUrls[0];
          if (pack && url) return `Source: [${pack}](${url})`;
          if (pack) return `Source: ${pack}`;
          return '';
      })();
      
      if (source) sectionLines.push(source);
      if (tags) sectionLines.push(tags);
      if (aliases) sectionLines.push(aliases);

      if (sectionLines.length) {
        parts.push('\n' + sectionLines.join('\n'));
      }
      return parts.length ? parts.join('\n') : undefined;
    }

     // Suggest Sounds
     for (const s of list) {
       if (!s || (prefix && !s.toLowerCase().startsWith(prefix))) continue;
       // Simplified detail for generic string
       const m = (meta as any)[s] || {};
       items.push({
         label: s,
         kind: CompletionItemKind.Constant,
         insertText: s,
         detail: (m.category as string) || 'Sound',
         sortText: `0_${s}`, // Sounds first
         documentation: { kind: 'markdown', value: soundDoc(s) || '' } as any,
       });
     }

     // Suggest Banks
     const banks = new Set<string>();
     for (const k of Object.keys(meta)) {
       const bs = (meta as any)[k]?.banks as string[] | undefined;
       if (Array.isArray(bs)) for (const b of bs) banks.add(b);
     }
     
     for (const b of banks) {
        if (prefix && !b.toLowerCase().startsWith(prefix)) continue;
        
        // Rich documentation for banks (reusing logic)
        const usedBy: string[] = [];
        const categories = new Set<string>();
        for (const k of Object.keys(meta)) {
           const m = (meta as any)[k];
           const bs = m?.banks;
           if (Array.isArray(bs) && bs.includes(b)) {
             usedBy.push(k);
             if (m.category) categories.add(m.category);
           }
        }
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
          ? sortedCats.length > 3 ? `${sortedCats.slice(0, 3).join(', ')}...` : sortedCats.join(', ')
          : 'various';
        const summary = sortedCats.length === 1 ? `**${sortedCats[0]}** bank` : `Bank containing **${catDesc}** sounds`;
        
        const humanName = b.replace(/([A-Z]+)/g, ' $1').trim().replace(/([0-9]+)/g, ' $1').trim();
        const bankDesc = BankDescriptions[b];
        const descPart = bankDesc ? `\n\n${bankDesc}\n\n` : `\n\n`;

        items.push({
          label: b,
          kind: CompletionItemKind.EnumMember,
          insertText: b,
          detail: 'Bank',
          sortText: `1_${b}`, // Banks second
          documentation: {
             kind: 'markdown',
             value: `_${humanName}_${descPart}` +
                    summary + '\n\n' +
                    (usedBy.length ? `Used by: ${usedBy.join(', ')}` : '')
          } as any,
        });
     }
     
     // If we have matches, return them. Otherwise fall through?
     // Actually, if we are in a string, we probably ONLY want string-relevant things (sounds/banks/samples).
     // We definitely don't want function calls like `fast(..)` inside a string usually.
     // So we return here.
     return items;
  }

  // 4. Inside function call with known enums: propose enum choices
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

  // 5. Elsewhere: suggest transforms/functions AND quoted sounds/banks
  const builtinItems: CompletionItem[] = [];
  
  // A. Builtins
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
    builtinItems.push(item);
    if (builtinItems.length >= maxItems) break;
  }

  // B. Suggest Sounds/Banks with quotes (if we are not inside a string/sound call)
  // This addresses `const test = |`
  if (!isInsideSoundCall(doc, position) && !isInsideBankArg(doc, position) && !isInsideString(doc, position)) {
     const list = (soundsData as any).sounds as string[];
     const meta = (soundsData as any).meta || {};
     
     // Sounds (Quoted)
     for (const s of list) {
       if (!s || (prefix && !s.toLowerCase().startsWith(prefix))) continue;
       builtinItems.push({
         label: `"${s}"`, // Show with quotes
         kind: CompletionItemKind.Constant,
         insertText: `"${s}"`, // Insert with quotes
         detail: 'Sound (String)',
         sortText: `y_0_${s}`, // After builtins (a~), before z~ aliases?
       });
     }
     
     // Banks (Quoted)
     const banks = new Set<string>();
     for (const k of Object.keys(meta)) {
       const bs = (meta as any)[k]?.banks as string[] | undefined;
       if (Array.isArray(bs)) for (const b of bs) banks.add(b);
     }
     for (const b of banks) {
        if (prefix && !b.toLowerCase().startsWith(prefix)) continue;
        builtinItems.push({
          label: `"${b}"`,
          kind: CompletionItemKind.EnumMember,
          insertText: `"${b}"`,
          detail: 'Bank (String)',
          sortText: `y_1_${b}`,
        });
     }
  }

  return builtinItems;
}
