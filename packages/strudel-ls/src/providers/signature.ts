import type { SignatureHelp, Position } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import type { Builtin } from '../data/types';

function findCallNameBeforeParen(text: string, offset: number): string | null {
  let i = offset - 1;
  while (i > 0 && /\s/.test(text[i])) i--;
  if (text[i] !== '(') return null;
  i--;
  const end = i + 1;
  while (i >= 0 && /[A-Za-z0-9_]/.test(text[i])) i--;
  const name = text.slice(i + 1, end);
  return name || null;
}

export function provideSignatureHelp(
  doc: TextDocument,
  position: Position,
  builtins: Map<string, Builtin>,
): SignatureHelp | null {
  const offset = doc.offsetAt(position);
  const text = doc.getText();
  const name = findCallNameBeforeParen(text, offset);
  if (!name) return null;
  const b = builtins.get(name);
  if (!b || !b.signature) return null;
  const params = (b.signature.match(/\((.*)\)/)?.[1] || '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => ({ label: p }));
  return {
    signatures: [
      {
        label: b.signature,
        documentation: b.blurb,
        parameters: params,
      },
    ],
    activeSignature: 0,
    activeParameter: 0,
  };
}