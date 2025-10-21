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

function collectCodesFromTidal(json: any): string[] {
  const codes = new Set<string>();
  for (const key of Object.keys(json)) {
    const idx = key.indexOf("_");
    if (idx > 0) {
      const code = key.slice(idx + 1);
      if (code) codes.add(code);
    }
  }
  return Array.from(codes);
}

function collectKeys(obj: any): string[] {
  return Object.keys(obj || {});
}

function main() {
  const repo = process.argv[2] || process.env.STRUDEL_REPO;
  if (!repo) {
    console.error("Usage: generate-sounds.ts /path/to/strudel");
    process.exit(1);
  }
  const pub = resolve(repo, "website/public");

  const sounds = new Set<string>();
  for (const f of SOUND_FILES) {
    try {
      const p = join(pub, f);
      const data = JSON.parse(readFileSync(p, "utf8"));
      if (f.startsWith("tidal-drum-machines")) {
        for (const c of collectCodesFromTidal(data)) sounds.add(c);
      } else if (f === "uzu-drumkit.json") {
        for (const c of collectKeys(data)) if (!c.startsWith("_")) sounds.add(c);
      } else if (f === "mridangam.json" || f === "piano.json" || f === "vcsl.json") {
        for (const c of collectKeys(data)) if (!c.startsWith("_")) sounds.add(c);
      } else if (f === "uzu-wavetables.json") {
        // skip for s()
      }
    } catch (e) {
      // ignore missing
    }
  }

  const list = Array.from(sounds).sort();
  const out = resolve(process.cwd(), "src/data/sounds.json");
  writeFileSync(out, JSON.stringify({ sounds: list }, null, 2));
  console.log(`Wrote ${out} with ${list.length} sound keys.`);
}

main();