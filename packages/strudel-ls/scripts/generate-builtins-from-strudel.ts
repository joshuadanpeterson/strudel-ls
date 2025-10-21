#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

function stripHtml(html: string | undefined): string | undefined {
  if (!html) return undefined;
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

type Builtin = { name: string; kind: string; signature?: string; blurb?: string; example?: string };

function extractBuiltinsFromPattern(filePath: string) {
  const src = readFileSync(filePath, "utf8");
  const builtins: Builtin[] = [];

  const reGroup = /export\s+const\s+\{([^}]+)\}\s*=\s*register\(\[(.*?)\]/gms;
  let m: RegExpExecArray | null;
  while ((m = reGroup.exec(src))) {
    const namesArr = m[2]!
      .split(",")
      .map((s) => s.replace(/[\s'"`]/g, "").trim())
      .filter(Boolean);
    for (const n of namesArr) builtins.push({ name: n, kind: "transform" });
  }

  const reSingle = /export\s+const\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*register\(\s*['"`]([^'"`]+)['"`]/gms;
  while ((m = reSingle.exec(src))) {
    const apiName = m[2]!;
    builtins.push({ name: apiName, kind: "transform" });
  }

  const map = new Map<string, Builtin>();
  for (const b of builtins) if (!map.has(b.name)) map.set(b.name, b);
  return Array.from(map.values());
}

function loadDocs(docPath: string): Record<string, Builtin> {
  const raw = JSON.parse(readFileSync(docPath, 'utf8'));
  const out: Record<string, Builtin> = {};
  const entries: any[] = raw.docs || [];
  for (const d of entries) {
    const name = d.name as string;
    if (!name) continue;
    const params = (d.params || []).map((p: any) => `${p.name}: ${(p.type?.names?.[0] || 'any')}`);
    const signature = params.length ? `${name}(${params.join(', ')})` : `${name}()`;
    const blurb = stripHtml(d.description);
    const example = (d.examples && d.examples[0]) || undefined;
    out[name] = { name, kind: 'transform', signature, blurb, example };
    const synonyms: string[] = d.synonyms || [];
    for (const syn of synonyms) {
      if (!out[syn]) out[syn] = { name: syn, kind: 'transform', signature, blurb, example };
    }
  }
  return out;
}

function main() {
  const repo = process.argv[2] || process.env.STRUDEL_REPO;
  if (!repo) {
    console.error("Usage: generate-builtins-from-strudel.ts /path/to/strudel");
    process.exit(1);
  }
  const patternPath = resolve(repo, "packages/core/pattern.mjs");
  const candidates = extractBuiltinsFromPattern(patternPath);

  // Try to enrich from doc.json
  let docs: Record<string, Builtin> = {};
  try {
    docs = loadDocs(resolve(repo, 'doc.json'));
  } catch {}

  const mergedMap = new Map<string, Builtin>();
  for (const c of candidates) {
    const d = docs[c.name];
    if (d) mergedMap.set(c.name, { ...c, ...d, name: c.name }); else mergedMap.set(c.name, c);
  }
  // Also include any docs entries not present from pattern scan
  for (const [k, v] of Object.entries(docs)) if (!mergedMap.has(k)) mergedMap.set(k, v);

  const out = resolve(process.cwd(), "src/data/builtins.json");
  const finalList = Array.from(mergedMap.values());
  writeFileSync(out, JSON.stringify(finalList, null, 2));
  console.log(`Wrote ${out} with ${finalList.length} builtins.`);
}

main();