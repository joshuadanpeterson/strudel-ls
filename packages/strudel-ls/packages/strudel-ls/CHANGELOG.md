# Changelog

## [0.2.0](https://github.com/joshuadanpeterson/strudel-ls/compare/strudel-ls-v0.1.0...strudel-ls-v0.2.0) (2025-11-30)


### Features

* **bank:** 🧩 context-aware bank() completions and hover per selected sound ([be7f037](https://github.com/joshuadanpeterson/strudel-ls/commit/be7f037ad3d16e2b02cc1f81426455361dd644cf))
* **builtins:** 🎯 add params and enum choices from doc.json; context-aware enum completions and richer hover ([d65e8c9](https://github.com/joshuadanpeterson/strudel-ls/commit/d65e8c964183b68dfb99e8941e7b9340599a716b))
* **completion,hover:** 🧠 enable resolve; ranking tweaks; fuzzy fallback; source links for packs ([022cf59](https://github.com/joshuadanpeterson/strudel-ls/commit/022cf59c49ec513e7d12057d184c95341af22e19))
* **completion:** 🎧 treat sound("…") like s("…") for sound-name completions ([7018db4](https://github.com/joshuadanpeterson/strudel-ls/commit/7018db44adfddb8373258862dfe280a116f8887d))
* **completion:** 🧩 Prioritize single-letter completions and fix truncation ([c0cbd29](https://github.com/joshuadanpeterson/strudel-ls/commit/c0cbd297c289ca9cd8dd8e3caba44669491f45cc))
* **descriptions:** add comprehensive manual descriptions for all instruments and banks ([157fd1d](https://github.com/joshuadanpeterson/strudel-ls/commit/157fd1d6ec80ca494e0b001814ef05973ae6a80a))
* **ls:** ✨ complete Milestone 2 features (symbols, defs, refs, formatting) ([e41b7b9](https://github.com/joshuadanpeterson/strudel-ls/commit/e41b7b9873ba2d2f943a32d6040d4ac150c00382))
* **ls:** 🎸 Standardize instrument label to "Sound" ([8178ffa](https://github.com/joshuadanpeterson/strudel-ls/commit/8178ffaf9e246df0fa8aebf32c69d89a2d70db7c))
* **ls:** 📝 add documentation for builtins in autocomplete and hover ([df5d016](https://github.com/joshuadanpeterson/strudel-ls/commit/df5d016de489287ab0f4997160bcf83a5e1f69eb))
* **ls:** 🚀 complete Milestone 3 features (rename, semantic tokens, refactor) ([218d6ec](https://github.com/joshuadanpeterson/strudel-ls/commit/218d6ec3aca029e88e8e7486150443d2e69ab1e6))
* **lsp:** ✨ expand completion trigger characters for better Neovim autocompletion ([73874b6](https://github.com/joshuadanpeterson/strudel-ls/commit/73874b6da344082db2a39d595f958914faf64c94))
* **lsp:** 🎯 context-aware completions, signature help, hover, diagnostics, formatting ([ef02a2a](https://github.com/joshuadanpeterson/strudel-ls/commit/ef02a2ad8a6c9ed3706faa80a50b92c17fa0a65d))
* **lsp:** bootstrap strudel-ls with tree-sitter-strdl and core features ✨ ([86abc12](https://github.com/joshuadanpeterson/strudel-ls/commit/86abc12ff265686c713467bb77b87b0e36803e5a))
* **ls:** sounds prefix gating, examples in completion, and alias docs ([#1](https://github.com/joshuadanpeterson/strudel-ls/issues/1)) ([74c91bc](https://github.com/joshuadanpeterson/strudel-ls/commit/74c91bcc9d7c041831f5c418c4dcef53410e0c9f))
* **sounds:** 🎧 enrich sound completions and hover with clean metadata ([8d3f992](https://github.com/joshuadanpeterson/strudel-ls/commit/8d3f9929b2e375edd3bcce3e46532f2877b186c4))


### Bug Fixes

* **bank:** detect .bank(...) before closing paren and fallback to union of banks when sound unknown ([7afdd58](https://github.com/joshuadanpeterson/strudel-ls/commit/7afdd5804a0010511822aa40cdb2ab93e1e02b62))
* **completion:** 🐛 add banks to sound completions and allow empty prefix ([9ad35f6](https://github.com/joshuadanpeterson/strudel-ls/commit/9ad35f6805a00042823a7d3beb029e04709a7f90))
* **completion:** 🐛 allow sound completions inside empty quotes ([dc20254](https://github.com/joshuadanpeterson/strudel-ls/commit/dc202547a56f49101ffc6fe4f7df39a7ec2622bb))
* **completion:** 🐛 Fix completion leaking into non-string contexts ([d40b8aa](https://github.com/joshuadanpeterson/strudel-ls/commit/d40b8aacbc0ea4f89c722cfa63e2bad8e38b91a8))
* **completion:** 🐛 Restore missing completion/hover functionality ([d1feb4a](https://github.com/joshuadanpeterson/strudel-ls/commit/d1feb4ad56417f03c8848a5c5bfe2b1f3185c9b3))
* **completion:** suppress unrelated suggestions inside function parens when no enum choices (focus on parameters) ([92557ad](https://github.com/joshuadanpeterson/strudel-ls/commit/92557adf9255fae08909c6ce84df8835f780c10c))
* **docs:** remove duplicate auto-generated descriptions when manual ones exist ([ca6fb94](https://github.com/joshuadanpeterson/strudel-ls/commit/ca6fb941f582b68004237e28efbca61114943fb1))
* **hover:** 🐛 Enable global hover for sounds and banks ([a652055](https://github.com/joshuadanpeterson/strudel-ls/commit/a65205568194a9b33982db50b4edb7cb430c6b43))
* **hover:** 🐛 Fix bank hover descriptions and remove misleading completions ([830c460](https://github.com/joshuadanpeterson/strudel-ls/commit/830c4605d5309444274a5f9b1ee5e9fba8423bdb))
* **hover:** ensure bank descriptions are correctly declared ([68fcfd8](https://github.com/joshuadanpeterson/strudel-ls/commit/68fcfd84bb0011455cd8ffc5e769d652745d38ba))
