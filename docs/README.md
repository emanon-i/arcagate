# Arcagate Documentation

PC 上に散在する起動元を集約する個人用ランチャー。 Tauri v2 + SvelteKit + Svelte 5 runes + Rust + SQLite。

## doc 構造 (L0-L3 layer model)

| layer             | dir                                      | 役割                                                                                                    | 更新頻度             |
| ----------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------- |
| **L0** (要求)     | [`l0_ideas/`](./l0_ideas/)               | なぜ作る / 何 / 誰のため / Non-goals / 成功条件 / 制約 / 利用形態 / 失敗パターン (motivation.md 1 file) | 開発進むほど触らない |
| **L1** (要件)     | [`l1_requirements/`](./l1_requirements/) | gen-l1 待ち (生成後 vision.md 入る予定、 現状 README.md のみ)                                           | 未着手               |
| **L2** (基本設計) | [`l2_foundation/`](./l2_foundation/)     | 全体アーキテクチャ + 画面別機能カタログ + テストシナリオ + 失敗駆動メモリ                               | 機能追加で都度       |
| **L3** (実装計画) | [`l3_phases/`](./l3_phases/)             | PR/phase 計画、 完了したら `_archive/` 移動                                                             | アドホック           |

`_archive/` は **L3 のみ** に存在する (他 layer は `_archive/` 作らない rule)。

## L0 内訳

| file                                                 | 内容                               |
| ---------------------------------------------------- | ---------------------------------- |
| [`l0_ideas/motivation.md`](./l0_ideas/motivation.md) | 開発者要求 (a)〜(h)、 stable layer |

## L2 内訳

| file                                                                   | 内容                                                                                |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| [`l2_foundation/foundation.md`](./l2_foundation/foundation.md)         | 全体アーキテクチャ (技術 stack / レイヤー / IPC / state / schema / dirs / 設計判断) |
| [`l2_foundation/test_scenarios.md`](./l2_foundation/test_scenarios.md) | テストシナリオ ⇄ テスト実装 link (T1-T4 plan + critical path + regression)          |
| [`l2_foundation/lessons.md`](./l2_foundation/lessons.md)               | 失敗駆動メモリ (「verify pass = 治った」 禁止等のメタ教訓)                          |
| [`l2_foundation/screens/`](./l2_foundation/screens/)                   | 画面別機能カタログ (palette / library / workspace / settings / onboarding)          |

## navigation

- session 開始 / 作業前必読 は repo root [`/CLAUDE.md`](../CLAUDE.md) 参照 (LLM agent 用 navigation も統合済、 別 file の `llms.txt` は廃止)
