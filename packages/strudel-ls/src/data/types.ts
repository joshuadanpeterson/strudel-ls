export type BuiltinKind = 'function' | 'transform' | 'combinator' | 'other';

export interface Builtin {
  name: string;
  kind: BuiltinKind;
  signature?: string;
  blurb?: string;
  example?: string;
  // Optional richer param metadata when available from doc.json
  params?: { name: string; type?: string; optional?: boolean; doc?: string }[];
  // Aliasing metadata (populated by data generator when available)
  synonyms?: string[];
  aliasOf?: string;
}

export interface SoundMeta {
  banks?: string[];  // e.g. drum machine or library bank membership
  packs?: string[];  // e.g. mridangam, piano, vcsl, uzu-drumkit
  aliases?: string[];
  tags?: string[];   // e.g. vibrato, sustain, staccato, rim, etc.
  sources?: string[]; // source datasets used
  count?: number;     // number of available samples
  category?: string;  // high-level category (e.g., Membranophones, kick drum, Keyboard)
  family?: string;    // subcategory/family when available (e.g., Struck Membranophones)
  desc?: string;      // synthesized one-line description
  baseUrls?: string[]; // source base URLs, if known (e.g., pack repositories)
}
