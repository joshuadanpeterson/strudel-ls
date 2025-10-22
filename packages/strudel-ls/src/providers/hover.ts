import type { Hover, Position } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import type { Builtin } from '../data/types';
import { getWordRangeAtPosition } from '../analyzer/utils';

export function provideHover(
  doc: TextDocument,
  position: Position,
  builtins: Map<string, Builtin>,
): Hover | null {
  const range = getWordRangeAtPosition(doc, position);
  if (!range) return null;
  const word = doc.getText(range);
  const b = builtins.get(word);
  if (!b) return null;
  const mdParts: string[] = [];
  mdParts.push(b.signature ? `\`\`${b.signature}\`\`` : `\`\`${b.name}\`\``);
  if (b.blurb) mdParts.push(`\n\n${b.blurb}`);
  if (b.example) mdParts.push(`\n\nExample:\n\n\`\`\`strudel\n${b.example}\n\`\`\``);
  // Alias information
  if (b.aliasOf) {
    mdParts.push(`\n\nAlias of: \`${b.aliasOf}\``);
  } else if (b.synonyms && b.synonyms.length) {
    mdParts.push(`\n\nAliases: ${b.synonyms.join(', ')}`);
  }
  return {
    contents: { kind: 'markdown', value: mdParts.join('') },
    range,
  };
}
