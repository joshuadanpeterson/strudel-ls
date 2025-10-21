import prettier from "prettier";
import plugin from "../src/index.js";

const code = 's("bd*4 | sn")';
const exts = [".strudel", ".strdl", ".str", ".std"];

for (const ext of exts) {
  const out = await prettier.format(code, { plugins: [plugin], filepath: `foo${ext}` });
  if (out.trim() !== code) {
    console.error(`Unexpected output for ${ext}:`, out);
    process.exit(1);
  }
}
console.log("OK");