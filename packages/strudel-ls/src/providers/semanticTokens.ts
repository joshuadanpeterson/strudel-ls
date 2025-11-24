import {
  SemanticTokens,
  SemanticTokensParams,
  SemanticTokensBuilder,
  SemanticTokensLegend,
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getTree } from '../analyzer/parser';
import type { SyntaxNode } from 'tree-sitter';

// Define standard legend
export const semanticTokensLegend: SemanticTokensLegend = {
  tokenTypes: [
    'variable',
    'function',
    'parameter',
    'string',
    'number',
    'keyword',
    'operator',
    'comment',
  ],
  tokenModifiers: ['declaration', 'definition', 'readonly'],
};

const typeMap: Record<string, number> = {
  variable: 0,
  function: 1,
  parameter: 2,
  string: 3,
  number: 4,
  keyword: 5,
  operator: 6,
  comment: 7,
};

export function provideSemanticTokens(
  doc: TextDocument,
  _params: SemanticTokensParams
): SemanticTokens | null {
  const tree = getTree(doc);
  if (!tree) return null;

  const builder = new SemanticTokensBuilder();
  const root = tree.rootNode;

  function visit(node: SyntaxNode) {
    const range = {
        start: doc.positionAt(node.startIndex),
        end: doc.positionAt(node.endIndex),
    };
    
    // Only support single-line tokens for now
    if (range.start.line !== range.end.line) {
         // Recurse but don't token the whole block
         for (let i = 0; i < node.namedChildCount; i++) visit(node.namedChild(i)!);
         return;
    }

    let type: string | undefined;
    let modifiers: number = 0;

    switch (node.type) {
      case 'string':
      case 'string_fragment':
        type = 'string';
        break;
      case 'number':
        type = 'number';
        break;
      case 'comment':
        type = 'comment';
        break;
      case 'identifier':
        // Heuristics for identifier type
        if (node.parent?.type === 'function_declaration') {
            type = 'function';
            modifiers = 1; // declaration
        } else if (node.parent?.type === 'call_expression' && node.parent.child(0)?.id === node.id) {
            type = 'function';
        } else if (node.parent?.type === 'variable_declarator' && node.parent.childForFieldName('name')?.id === node.id) {
            type = 'variable';
            modifiers = 1; // declaration
        } else {
            type = 'variable';
        }
        break;
      case 'property_identifier':
        type = 'variable'; // or property
        break;
      // Add more cases as needed
    }

    if (type && typeMap[type] !== undefined) {
      // length in characters
      const length = node.endIndex - node.startIndex;
      builder.push(range.start.line, range.start.character, length, typeMap[type], modifiers);
    }
    
    for (let i = 0; i < node.namedChildCount; i++) {
      visit(node.namedChild(i)!);
    }
  }

  visit(root);
  return builder.build();
}
