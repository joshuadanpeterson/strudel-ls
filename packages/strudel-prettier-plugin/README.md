# @strudel-tools/prettier-plugin-strudel

Minimal Prettier plugin that recognizes Strudel files and performs no-op formatting.

- Extensions: `.strudel`, `.strdl`, `.str`, `.std`
- Parser: `strudel` (identity)

Usage (Prettier 3+):

```sh
prettier --plugin=@strudel-tools/prettier-plugin-strudel "**/*.{strudel,strdl,str,std}" --write
```