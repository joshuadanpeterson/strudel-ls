import type { TextEdit } from 'vscode-languageserver';
import { Position, Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

function isWordChar(ch: string): boolean {
  return /[A-Za-z0-9_]/.test(ch);
}

function normalizeLine(line: string): string {
  let out = '';
  let inString = false;
  let escape = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inString) {
      out += ch;
      if (escape) {
        escape = false;
      } else if (ch === '\\') {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      out += ch;
      continue;
    }
    if (ch === ' ') {
      if (out.endsWith(' ')) continue;
      out += ch;
      continue;
    }
    if (ch === '|') {
      if (!out.endsWith(' ') && out.length > 0) out += ' ';
      out += '|';
      let j = i + 1;
      while (j < line.length && line[j] === ' ') j++;
      if (j < line.length) out += ' ';
      i = j - 1;
      continue;
    }
    if (ch === ',') {
      if (out.endsWith(' ')) out = out.slice(0, -1);
      out += ',';
      let j = i + 1;
      while (j < line.length && line[j] === ' ') j++;
      const next = j < line.length ? line[j] : '';
      if (next && (isWordChar(next) || next === '"' || next === '(' || next === '[')) {
        out += ' ';
      }
      i = j - 1;
      continue;
    }
    out += ch;
  }
  return out;
}

function wrapByPipes(line: string, lineWidth: number): string {
  if (lineWidth <= 0) return line;
  if (line.length <= lineWidth) return line;
  const parts = line.split(/\s\|\s/g);
  if (parts.length === 1) return line;
  let acc = '';
  let current = '';
  for (let i = 0; i < parts.length; i++) {
    const seg = parts[i];
    const candidate = current ? current + ' | ' + seg : seg;
    if (candidate.length > lineWidth && current) {
      acc += (acc ? '\n' : '') + current;
      current = seg;
    } else {
      current = candidate;
    }
  }
  if (current) acc += (acc ? '\n' : '') + current;
  return acc || line;
}

function computeFullRange(doc: TextDocument): Range {
  return { start: Position.create(0, 0), end: doc.positionAt(doc.getText().length) };
}

export function formatDocument(doc: TextDocument, lineWidth: number): TextEdit[] {
  const text = doc.getText();
  const lines = text.split(/\r?\n/);
  const outLines: string[] = [];
  let skipNext = false;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (skipNext) {
      outLines.push(l);
      skipNext = false;
      continue;
    }
    if (l.includes('prettier-ignore') || l.includes('strudel-ls-ignore')) {
      outLines.push(l);
      skipNext = true;
      continue;
    }
    const normalized = normalizeLine(l);
    const wrapped = wrapByPipes(normalized, lineWidth);
    outLines.push(wrapped);
  }
  const formatted = outLines.join('\n');
  if (formatted === text) return [];
  return [{ range: computeFullRange(doc), newText: formatted }];
}