import { DefinitionParams, Location, Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getTree } from '../analyzer/parser';
import type { SyntaxNode } from 'tree-sitter';

function getRange(node: SyntaxNode, doc: TextDocument): Range {
  return {
    start: doc.positionAt(node.startIndex),
    end: doc.positionAt(node.endIndex),
  };
}

export function provideDefinition(
  doc: TextDocument,
  params: DefinitionParams
): Location | null {
  const tree = getTree(doc);
  if (!tree) return null;

  const offset = doc.offsetAt(params.position);
  const node = tree.rootNode.descendantForIndex(offset);

  if (!node || !['identifier', 'property_identifier'].includes(node.type)) {
    return null;
  }

  const name = node.text;
  let definitionNode: SyntaxNode | null = null;

  // Simple scope walk: look up from current node to root, checking for declarations in each scope
  // This is naive but works for many flat scripts common in Strudel
  let current: SyntaxNode | null = node.parent;
  while (current) {
    // Search siblings for declaration
    // Look for variable declarations before this point
    // Or function declarations
    
    // We might need to search the whole tree or at least the current block for declarations 
    // that precede the usage, or top-level declarations anywhere.
    
    // Let's look for variable_declarator or function_declaration matching name
    // in the current block's children or the root
    
    // For simplicity in this MVP: search the entire root for a declaration of this name
    // This handles top-level definitions well.
    
    // If we want to be smarter, we can scope it, but let's start simple.
    // Actually, searching the whole tree for a declaration is safer than just parents for top-level funcs (hoisting)
    
    // Breaking loop to do a full tree search for now
    break;
  }

  const root = tree.rootNode;
  function findDecl(n: SyntaxNode): SyntaxNode | null {
    if (n.type === 'variable_declarator') {
      const nameNode = n.childForFieldName('name');
      if (nameNode && nameNode.text === name) return nameNode;
    } else if (n.type === 'function_declaration') {
      const nameNode = n.childForFieldName('name');
      if (nameNode && nameNode.text === name) return nameNode;
    } else if (n.type === 'assignment_expression') {
        const left = n.childForFieldName('left');
        if (left && left.text === name) return left;
    }
    
    for (let i = 0; i < n.namedChildCount; i++) {
      const res = findDecl(n.namedChild(i)!);
      if (res) return res;
    }
    return null;
  }

  definitionNode = findDecl(root);

  // Avoid returning the usage itself as definition if it's the same node
  if (definitionNode && definitionNode.id !== node.id) {
     return Location.create(doc.uri, getRange(definitionNode, doc));
  }

  return null;
}
