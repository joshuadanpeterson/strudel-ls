export type BuiltinKind = 'function' | 'transform' | 'combinator' | 'other';

export interface Builtin {
  name: string;
  kind: BuiltinKind;
  signature?: string;
  blurb?: string;
  example?: string;
  // Optional richer param metadata when available from doc.json
  params?: { name: string; type?: string; optional?: boolean; doc?: string }[];
}