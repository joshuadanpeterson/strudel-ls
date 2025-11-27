import type { Builtin } from '../data/types';

export function buildBuiltinDoc(b: Builtin): string {
  const parts: string[] = [];

  // Title / Signature
  if (b.signature) {
    parts.push(`**${b.signature}**`);
  } else {
    parts.push(`**${b.name}**`);
  }
  
  if (b.kind) {
      parts.push(`*${b.kind}*`);
  }

  if (b.aliasOf) {
    parts.push(`Alias of: \`${b.aliasOf}\``);
  }

  if (b.blurb) {
    parts.push(b.blurb);
  }

  if (b.params && b.params.length > 0) {
    const paramLines = b.params.map(p => {
      let s = `- \`${p.name}\``;
      if (p.type) s += `: ${p.type}`;
      if (p.doc) s += ` — ${p.doc}`;
      return s;
    });
    parts.push('**Parameters:**\n' + paramLines.join('\n'));
  }

  if (b.example) {
    parts.push('**Example:**');
    parts.push('```strudel\n' + b.example + '\n```');
  }

  if (b.synonyms && b.synonyms.length > 0) {
    parts.push(`Aliases: ${b.synonyms.join(', ')}`);
  }

  return parts.join('\n\n');
}

export function buildSnippet(name: string, signature?: string): string {
  // If no signature, we just append "()" to function/transform types?
  // Or just the name if it's a constant?
  // But the caller passes b.signature.
  
  if (!signature) return name;
  
  // signature: "firstOf(n: number, func: function)"
  // We want: "firstOf(${1:n}, ${2:func})"
  
  // Extract content between first ( and last )
  const openIdx = signature.indexOf('(');
  const closeIdx = signature.lastIndexOf(')');
  
  if (openIdx === -1 || closeIdx === -1 || closeIdx <= openIdx) {
      // No parens or malformed
      return name;
  }
  
  const paramsStr = signature.slice(openIdx + 1, closeIdx);
  if (!paramsStr.trim()) {
      return `${name}()`;
  }
  
  // Split parameters. Simple split by ',' works for most Strudel builtins as they don't have complex nested types in signatures yet.
  const params = paramsStr.split(',');
  
  const snippetParams = params.map((p, i) => {
    // p might be "n: number" or "n"
    const parts = p.trim().split(':');
    const paramName = parts[0].trim();
    // We use the param name as the placeholder
    return `\${${i + 1}:${paramName}}`;
  });
  
  return `${name}(${snippetParams.join(', ')})`;
}
