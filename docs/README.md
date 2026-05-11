# Arcagate Documentation

Personal launcher consolidating PC-wide entry points. Tauri v2 + SvelteKit + Svelte 5 runes + Rust + SQLite.

## doc 構造 (Tri-SSD 4 階層)

| dir                                      | 役割                                                      | 主要ファイル                                                                                         |
| ---------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| [`l0_ideas/`](./l0_ideas/)               | ユーザーの要求・アイデア（ID なし、他 AI にも渡せる指針） | product-vision / ux-vision / visual-references / screens-and-flows                                   |
| [`l1_requirements/`](./l1_requirements/) | L0 をもとにした要件定義（REQ-ID つき、テスト可能な仕様）  | **vision.md** / ux-standards / design-system / desktop-ui-rules / release-criteria / distribution/   |
| [`l2_foundation/`](./l2_foundation/)     | L1 を満たす技術スタック・アーキテクチャ・設計原則         | **foundation.md** (+ 8 partner files) / engineering-principles / folder-map / frontend-backend-split |
| [`l3_phases/`](./l3_phases/)             | 実装計画（現在は全てアーカイブ済）                        | `_archive/`                                                                                          |

LLM agent は [`llms.txt`](./llms.txt) を取得して全体 navigation。

## live single-file (top-level)

- [`lessons.md`](./lessons.md) — 失敗駆動メモリ
