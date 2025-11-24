import { ReferenceParams, Location, Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getTree } from '../analyzer/parser';
import type { SyntaxNode } from 'tree-sitter';

function getRange(node: SyntaxNode, doc: TextDocument): Range {
  return {
    start: doc.positionAt(node.startIndex),
    end: doc.positionAt(node.endIndex),
  };
}

export function provideReferences(
  doc: TextDocument,
  params: ReferenceParams
): Location[] | null {
  const tree = getTree(doc);
  if (!tree) return null;

  const offset = doc.offsetAt(params.position);
  const node = tree.rootNode.descendantForIndex(offset);

  if (!node || !['identifier', 'property_identifier'].includes(node.type)) {
    return null;
  }

  const name = node.text;
  const locations: Location[] = [];

  // MVP: Traverse entire tree and find identifiers with same text
  // This will naturally include the definition and all usages.
  // Ideally we'd resolve scope, but for single-file scripts this is 95% accurate.
  
  function visit(n: SyntaxNode) {
    if (['identifier', 'property_identifier'].includes(n.type)) {
        if (n.text === name) {
            locations.push(Location.create(doc.uri, getRange(n, doc)));
        }
    }
    for (let i = 0; i < n.childCount; i++) {
        visit(n.child(i)!);
    }
  }

  visit(tree.rootNode);
  return locations;
}
