#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const out = resolve(process.cwd(), "src/data/builtins.json");
const seed = [
  { name: "s", kind: "function", signature: "s(pattern: string)", blurb: "Set sample pattern.", example: "s \"bd*4 | sn\"" },
  { name: "fast", kind: "transform", signature: "fast(n: number, pattern)", blurb: "Speed up pattern.", example: "fast 2 $ s \"bd sn\"" },
];
writeFileSync(out, JSON.stringify(seed, null, 2));
console.log(`Wrote ${out}`);