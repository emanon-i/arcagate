# Arcagate Documentation

Personal launcher consolidating PC-wide entry points. Tauri v2 + SvelteKit + Svelte 5 runes + Rust + SQLite.

## doc 構造 (Tri-SSD 4 階層)

| dir                                      | 役割                              | canonical files                                                                                                                               |
| ---------------------------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| [`l0_ideas/`](./l0_ideas/)               | アイデア / 哲学 / 視覚言語 (任意) | concept / engineering-principles / visual-language / ux-design                                                                                |
| [`l1_requirements/`](./l1_requirements/) | 要件 / spec / guide               | **vision.md** (Tri-SSD canonical L1) / ux-standards / design-system / desktop-ui-rules / release-criteria / industrial-yellow / distribution/ |
| [`l2_foundation/`](./l2_foundation/)     | システム構成                      | **foundation.md** (Tri-SSD canonical L2、overview + 8 partner files)                                                                          |
| [`l2_architecture/`](./l2_architecture/) | architecture spec (plugin 範囲外) | folder-map / frontend-backend-split / `_archive/`                                                                                             |
| [`l3_phases/`](./l3_phases/)             | フェーズ / 実装単位               | PH-NNNN_*.md / `_archive/` (Tri-SSD canonical archive)                                                                                        |

LLM agent は [`llms.txt`](./llms.txt) を一発取得して全体 navigation。

## live single-file (top-level)

- [`lessons.md`](./lessons.md) — 失敗駆動メモリ、git 履歴で歴史追える

## doc system 詳細

R10+ 以降の整理結果。詳細は [`l1_requirements/docs-reorg/`](./l1_requirements/docs-reorg/) (D1-D5 の reorg 設計、PR merge 後 archive へ)。
