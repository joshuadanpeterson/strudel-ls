import type { Position, Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

export function getWordRangeAtPosition(doc: TextDocument, position: Position): Range | null {
  const text = doc.getText();
  const offset = doc.offsetAt(position);
  let start = offset;
  let end = offset;
  const isWord = (ch: string) => /[A-Za-z0-9_]/.test(ch);
  while (start > 0 && isWord(text[start - 1])) start--;
  while (end < text.length && isWord(text[end])) end++;
  if (start === end) return null;
  return { start: doc.positionAt(start), end: doc.positionAt(end) };
}

export function getWordAtPosition(doc: TextDocument, position: Position): string | null {
  const range = getWordRangeAtPosition(doc, position);
  if (!range) return null;
  return doc.getText(range);
}