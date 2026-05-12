# Arcagate Documentation

PC 上に散在する起動元を集約する個人用ランチャー。 Tauri v2 + SvelteKit + Svelte 5 runes + Rust + SQLite。

## doc 構造 (L0-L3 layer model)

| layer             | dir / file                               | 役割                                                                                                 | 更新頻度             |
| ----------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------- |
| **L0** (要求)     | [`motivation.md`](./motivation.md)       | なぜ作る / 何を作る / 誰のため / Non-goals / 成功条件 / 制約 / 利用形態 / 失敗パターン (1 file 統合) | 開発進むほど触らない |
| **L1** (要件)     | [`l1_requirements/`](./l1_requirements/) | gen-l1 想定の空 dir (`.gitkeep` のみ)                                                                | 未着手               |
| **L2** (基本設計) | [`l2_foundation/`](./l2_foundation/)     | 全体アーキテクチャ + 画面別機能カタログ + テストシナリオ                                             | 機能追加で都度       |
| **L3** (実装計画) | [`l3_phases/`](./l3_phases/)             | PR/phase 計画、 完了したら `_archive/` 移動                                                          | アドホック           |

`_archive/` は **L3 のみ** に存在する (他 layer は `_archive/` 作らない rule)。

## L2 内訳

| file                                                                   | 内容                                                                                |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| [`l2_foundation/foundation.md`](./l2_foundation/foundation.md)         | 全体アーキテクチャ (技術 stack / レイヤー / IPC / state / schema / dirs / 設計判断) |
| [`l2_foundation/test_scenarios.md`](./l2_foundation/test_scenarios.md) | テストシナリオ ⇄ テスト実装 link (T1-T4 plan + critical path + regression)          |
| [`l2_foundation/screens/`](./l2_foundation/screens/)                   | 画面別機能カタログ (palette / library / workspace / settings / onboarding)          |

## live single-file (top-level)

- [`lessons.md`](./lessons.md) — 失敗駆動メモリ。 「verify pass = 治った」 禁止等の メタ教訓のみ

## navigation

- LLM agent は [`llms.txt`](./llms.txt) を取得して全体 navigation
- session 開始 / 作業前必読 は repo root [`/CLAUDE.md`](../CLAUDE.md) 参照
