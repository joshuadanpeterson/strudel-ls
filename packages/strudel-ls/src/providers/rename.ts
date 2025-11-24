import { RenameParams, WorkspaceEdit, Range, Position } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getTree } from '../analyzer/parser';
import type { SyntaxNode } from 'tree-sitter';

function getRange(node: SyntaxNode, doc: TextDocument): Range {
  return {
    start: doc.positionAt(node.startIndex),
    end: doc.positionAt(node.endIndex),
  };
}

export function prepareRename(
  doc: TextDocument,
  position: Position
): Range | null {
  const tree = getTree(doc);
  if (!tree) return null;

  const offset = doc.offsetAt(position);
  const node = tree.rootNode.descendantForIndex(offset);

  if (!node || !['identifier', 'property_identifier'].includes(node.type)) {
    return null;
  }
  
  return getRange(node, doc);
}

export function provideRename(
  doc: TextDocument,
  params: RenameParams
): WorkspaceEdit | null {
  const tree = getTree(doc);
  if (!tree) return null;

  const offset = doc.offsetAt(params.position);
  const node = tree.rootNode.descendantForIndex(offset);

  if (!node || !['identifier', 'property_identifier'].includes(node.type)) {
    return null;
  }

  const oldName = node.text;
  const newName = params.newName;
  const edits: import('vscode-languageserver').TextEdit[] = [];

  // MVP: Simple global replace of identifier with same name
  // Similar to References provider
  function visit(n: SyntaxNode) {
    if (['identifier', 'property_identifier'].includes(n.type)) {
      if (n.text === oldName) {
        edits.push({ range: getRange(n, doc), newText: newName });
      }
    }
    for (let i = 0; i < n.childCount; i++) {
      visit(n.child(i)!);
    }
  }

  visit(tree.rootNode);

  return {
    changes: {
      [doc.uri]: edits,
    },
  };
}
