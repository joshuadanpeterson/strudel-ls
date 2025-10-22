#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";

const SOUND_FILES = [
  "tidal-drum-machines.json",
  "tidal-drum-machines-alias.json",
  "uzu-drumkit.json",
  "mridangam.json",
  "piano.json",
  "vcsl.json",
  "uzu-wavetables.json",
];

function collectCodesFromTidal(json: any): Array<{ code: string; bank?: string }> {
  const out: Array<{ code: string; bank?: string }> = [];
  for (const key of Object.keys(json)) {
    const idx = key.indexOf("_");
    if (idx > 0) {
      const bank = key.slice(0, idx);
      const code = key.slice(idx + 1);
      if (code) out.push({ code, bank });
    }
  }
  return out;
}

function collectKeys(obj: any): string[] {
  return Object.keys(obj || {});
}

function classifyTags(name: string): string[] {
  const tags: string[] = [];
  const lower = name.toLowerCase();
  const tests: Array<[RegExp, string]> = [
    [/\bvib(rato)?\b/, "vibrato"],
    [/\bsus(p|tain)?\b/, "sustain"],
    [/\bstacc?\b/, "staccato"],
    [/\broll\b/, "roll"],
    [/\bbowed?\b/, "bowed"],
    [/\bsoft\b/, "soft"],
    [/\bhard\b/, "hard"],
    [/\bacc\b/, "accent"],
    [/\bff\b/, "ff"],
    [/\bpp\b/, "pp"],
    [/\bmedium\b/, "medium"],
    [/\bmallet\b/, "mallet"],
    [/\bstick\b/, "stick"],
    [/\brim\b/, "rim"],
    [/\bsmall\b/, "small"],
    [/\blarge\b/, "large"],
  ];
  for (const [re, tag] of tests) if (re.test(lower)) tags.push(tag);
  return Array.from(new Set(tags));
}

function categoryFromCode(code: string): string | undefined {
  const m: Record<string, string> = {
    bd: 'kick drum',
    sd: 'snare drum',
    hh: 'hi-hat (closed)',
    oh: 'hi-hat (open)',
    cp: 'clap',
    cb: 'cowbell',
    cr: 'crash cymbal',
    rd: 'ride cymbal',
    lt: 'low tom',
    mt: 'mid tom',
    ht: 'high tom',
    rim: 'rim',
    tb: 'tambourine',
    perc: 'percussion',
    misc: 'misc',
  };
  return m[code] || undefined;
}

function categoryFromVcslPath(samplePath: string): { category?: string; family?: string } {
  const parts = samplePath.split('/');
  if (parts.length >= 2) {
    return { category: parts[0], family: parts[1] };
  }
  return {};
}

function synthesizeDesc(name: string, meta: any): string | undefined {
  const bits: string[] = [];
  const category = meta.category || categoryFromCode(name);
  if (category) bits.push(capitalize(category));
  const bank = Array.isArray(meta.banks) && meta.banks.length ? `from ${meta.banks.slice(0,2).join('/')}${meta.banks.length>2?'…':''}` : '';
  if (bank) bits.push(bank);
  const packs = Array.isArray(meta.packs) && meta.packs.length ? `(${meta.packs.slice(0,2).join('/')})` : '';
  if (packs) bits.push(packs);
  const count = typeof meta.count === 'number' ? `${meta.count} sample${meta.count===1?'':'s'}` : '';
  if (count) bits.push(count);
  // Do not include tags in the synthesized description to avoid duplication in UIs
  return bits.length ? bits.join(' · ') : undefined;
}

function capitalize(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1); }

function main() {
  const repo = process.argv[2] || process.env.STRUDEL_REPO;
  if (!repo) {
    console.error("Usage: generate-sounds.ts /path/to/strudel");
    process.exit(1);
  }
  const pub = resolve(repo, "website/public");

  const sounds = new Set<string>();
const meta: Record<string, { banks?: string[]; packs?: string[]; aliases?: string[]; tags?: string[]; sources?: string[]; count?: number; category?: string; family?: string; desc?: string; baseUrls?: string[] }> = {};
const packBases: Record<string, string> = {};

  function ensure(name: string) {
    if (!meta[name]) meta[name] = {};
    return meta[name];
  }

  for (const f of SOUND_FILES) {
    try {
      const p = join(pub, f);
      const data = JSON.parse(readFileSync(p, "utf8"));
      // Remember pack base URLs when present
      const baseUrl = typeof data._base === 'string' ? data._base : undefined;
      if (baseUrl) {
        const pack = f.replace(/\.json$/, "");
        packBases[pack] = baseUrl;
      }
if (f.startsWith("tidal-drum-machines")) {
        for (const [key, arr] of Object.entries<any>(data)) {
          const idx = key.indexOf('_');
          if (idx <= 0) continue;
          const bank = key.slice(0, idx);
          const code = key.slice(idx + 1);
          const count = Array.isArray(arr) ? arr.length : 0;
          sounds.add(code);
          const m = ensure(code);
          m.sources = Array.from(new Set([...(m.sources || []), "tidal-drum-machines"]));
          m.banks = Array.from(new Set([...(m.banks || []), bank]));
          m.count = (m.count || 0) + count;
          m.category = m.category || categoryFromCode(code);
          const tags = classifyTags(code);
          if (tags.length) m.tags = Array.from(new Set([...(m.tags || []), ...tags]));
        }
} else if (f === "uzu-drumkit.json") {
        for (const [c, arr] of Object.entries<any>(data)) {
          if (c.startsWith("_")) continue;
          sounds.add(c);
          const m = ensure(c);
          m.sources = Array.from(new Set([...(m.sources || []), "uzu-drumkit"]));
          m.packs = Array.from(new Set([...(m.packs || []), "uzu-drumkit"]));
          if (packBases['uzu-drumkit']) m.baseUrls = Array.from(new Set([...(m.baseUrls || []), packBases['uzu-drumkit']]));
          m.count = (m.count || 0) + (Array.isArray(arr) ? arr.length : 0);
          m.category = m.category || categoryFromCode(c);
          const tags = classifyTags(c);
          if (tags.length) m.tags = Array.from(new Set([...(m.tags || []), ...tags]));
        }
} else if (f === "mridangam.json" || f === "piano.json" || f === "vcsl.json") {
        const packName = f.replace(/\.json$/, "");
        for (const [c, arr] of Object.entries<any>(data)) {
          if (c.startsWith("_")) continue;
          sounds.add(c);
          const m = ensure(c);
          m.sources = Array.from(new Set([...(m.sources || []), packName]));
          m.packs = Array.from(new Set([...(m.packs || []), packName]));
          if (packBases[packName]) m.baseUrls = Array.from(new Set([...(m.baseUrls || []), packBases[packName]]));
          if (packName === 'vcsl' && Array.isArray(arr) && arr[0]) {
            const cat = categoryFromVcslPath(arr[0]);
            if (cat.category) m.category = m.category || cat.category;
            if (cat.family) m.family = m.family || cat.family;
            m.count = (m.count || 0) + arr.length;
          } else if (packName === 'mridangam' && Array.isArray(arr)) {
            m.category = m.category || 'Percussion';
            m.count = (m.count || 0) + arr.length;
          } else if (packName === 'piano' && typeof arr === 'object' && !Array.isArray(arr)) {
            // single code 'piano' with nested keys per note
            m.category = m.category || 'Keyboard';
            m.count = (m.count || 0) + Object.keys(arr).length;
          }
          const tags = classifyTags(c);
          if (tags.length) m.tags = Array.from(new Set([...(m.tags || []), ...tags]));
        }
      } else if (f === "uzu-wavetables.json") {
        // skip for s()
      }

      if (f === "tidal-drum-machines-alias.json") {
        // Best-effort alias collection: keys and/or values may contain codes; collect any suffix after '_'
        for (const [k, v] of Object.entries<any>(data || {})) {
          const kIdx = k.indexOf("_");
          const kCode = kIdx > 0 ? k.slice(kIdx + 1) : undefined;
          if (kCode) {
            sounds.add(kCode);
            const m = ensure(kCode);
            m.sources = Array.from(new Set([...(m.sources || []), "tidal-drum-machines"]));
          }
          const vals = Array.isArray(v) ? v : [v];
          for (const val of vals) {
            if (typeof val === 'string') {
              const vi = val.indexOf('_');
              const vCode = vi > 0 ? val.slice(vi + 1) : undefined;
              if (kCode && vCode && kCode !== vCode) {
                const m = ensure(vCode);
                m.aliases = Array.from(new Set([...(m.aliases || []), kCode]));
              }
            }
          }
        }
      }
    } catch (e) {
      // ignore missing
    }
  }

  const list = Array.from(sounds).sort();
  // Generate descriptions
  for (const name of list) {
    const m = ensure(name);
    m.desc = synthesizeDesc(name, m);
  }
  const out = resolve(process.cwd(), "src/data/sounds.json");
  writeFileSync(out, JSON.stringify({ sounds: list, meta }, null, 2));
  console.log(`Wrote ${out} with ${list.length} sound keys (with metadata for ${Object.keys(meta).length}).`);
}

main();
