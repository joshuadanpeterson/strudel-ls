import Parser from 'tree-sitter';
import Strdl from 'tree-sitter-strdl';
import type { Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import type { Builtin } from '../data/types';

export interface ParseError { range: Range; message: string }
export interface CallInfo { name: string; range: Range }
export interface ParseResult {
  errors: ParseError[];
  transforms: CallInfo[];
  unknownTransforms: CallInfo[];
}

let parserInstance: Parser | null = null;
function getParser(): Parser {
  if (!parserInstance) {
    parserInstance = new Parser();
    try {
      // @ts-ignore types may vary for dynamic grammar
      parserInstance.setLanguage(Strdl);
    } catch {
      // ignore; runtime environments without native module
    }
  }
  return parserInstance;
}

export function parseStrudel(doc: TextDocument, builtins: Map<string, Builtin>): ParseResult {
  const text = doc.getText();
  const errors: ParseError[] = [];
  const transforms: CallInfo[] = [];
  const unknownTransforms: CallInfo[] = [];

  // Try to parse with tree-sitter if available
  try {
    const parser = getParser();
    // Only parse if language set; otherwise parser.rootNode access would throw
    // @ts-ignore
    if ((parser as any).setLanguage) {
      const tree = parser.parse(text);
      const root = tree.rootNode;
      if (root.hasError) {
        const stack: any[] = [root];
        while (stack.length) {
          const n = stack.pop();
          if (n.isError) {
            const start = n.startIndex ?? 0;
            const end = n.endIndex ?? start + 1;
            errors.push({ range: { start: doc.positionAt(start), end: doc.positionAt(end) }, message: 'Syntax error' });
          }
          for (let i = 0; i < n.namedChildCount; i++) stack.push(n.namedChild(i));
        }
      }
    }
  } catch {
    // ignore tree-sitter failures; heuristics below still run
  }

  // Heuristic: collect calls and unknowns
  const re = /([A-Za-z_][A-Za-z0-9_]*)\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const name = m[1];
    const start = m.index;
    const end = start + name.length;
    const call: CallInfo = { name, range: { start: doc.positionAt(start), end: doc.positionAt(end) } };
    if (builtins.has(name)) transforms.push(call);
    else unknownTransforms.push(call);
  }

  // Heuristic: unterminated double-quote
  try {
    const dq = (text.match(/\"/g) || []).length;
    if (dq % 2 === 1) {
      const last = text.lastIndexOf('"');
      const start = Math.max(0, last - 1);
      errors.push({ range: { start: doc.positionAt(start), end: doc.positionAt(last + 1) }, message: 'Unterminated string literal' });
    }
  } catch {
    // ignore
  }

  return { errors, transforms, unknownTransforms };
}