import {
  DocumentSymbol,
  SymbolKind,
  Range,
  DocumentSymbolParams,
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getTree } from '../analyzer/parser';
import type { SyntaxNode } from 'tree-sitter';

function getRange(node: SyntaxNode, doc: TextDocument): Range {
  return {
    start: doc.positionAt(node.startIndex),
    end: doc.positionAt(node.endIndex),
  };
}

export function provideDocumentSymbols(
  doc: TextDocument,
  _params: DocumentSymbolParams
): DocumentSymbol[] {
  const tree = getTree(doc);
  if (!tree) return [];

  const symbols: DocumentSymbol[] = [];
  const root = tree.rootNode;

  function visit(node: SyntaxNode) {
    // Variable declaration: let x = ...
    if (node.type === 'variable_declarator') {
      const nameNode = node.childForFieldName('name');
      if (nameNode) {
        const range = getRange(node, doc);
        const selectionRange = getRange(nameNode, doc);
        symbols.push(
          DocumentSymbol.create(
            nameNode.text,
            'Variable',
            SymbolKind.Variable,
            range,
            selectionRange
          )
        );
      }
    }
    // Function declaration: function foo() {}
    else if (node.type === 'function_declaration') {
      const nameNode = node.childForFieldName('name');
      if (nameNode) {
        const range = getRange(node, doc);
        const selectionRange = getRange(nameNode, doc);
        symbols.push(
          DocumentSymbol.create(
            nameNode.text,
            'Function',
            SymbolKind.Function,
            range,
            selectionRange
          )
        );
      }
    }
    // Assignment: x = ...
    else if (node.type === 'assignment_expression') {
        const left = node.childForFieldName('left');
        if (left) {
            const range = getRange(node, doc);
            const selectionRange = getRange(left, doc);
            symbols.push(
                DocumentSymbol.create(
                    left.text,
                    'Assignment',
                    SymbolKind.Variable,
                    range,
                    selectionRange
                )
            );
        }
    }

    // Recurse
    for (let i = 0; i < node.namedChildCount; i++) {
      visit(node.namedChild(i)!);
    }
  }

  visit(root);
  return symbols;
}
