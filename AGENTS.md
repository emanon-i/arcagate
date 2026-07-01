# Arcagate — Agent Instructions (session 開始時必読)

PC 上に散在する起動元 (Steam / DMM ゲーム / ブラウザゲーム / 開発ツール / スクリプト / URL …) を
1 箇所に集約する個人用ランチャー。Windows 単独 user / ローカル完結 / 配布水準を常に狙う daily-use ツール。
V2 で「起動後の時間」を記録する低負荷パーソナル活動トラッカーを足す。

技術: Tauri v2 + SvelteKit (Svelte 5 runes) + Tailwind v4 + shadcn-svelte + Rust + rusqlite (SQLite)。

このファイルは **方向性・全体像・どこを見ればよいかの導線**に絞る。コードから読める詳細
(構造 / シグネチャ / token 値) は書かない。詳細規約は下記 rule に、詳細仕様は docs/ に置く。

## 詳細規約 (session に読み込む)

@.claude/rules/engineering.md
@.claude/rules/workflow.md

- `engineering.md` — 設計の固定枠 (レイヤー / DB / error / ORM) と禁止事項 (color hardcode 等)
- `workflow.md` — 完了基準・調査規律・開発ルーチン・branch/commit・agent 運用・暴走ブレーキ

## 作業前に読む

1. [docs/l0_ideas/motivation.md](docs/l0_ideas/motivation.md) — L0 製品要求 (なぜ / 何 / 誰 / Non-goals / 成功条件)
2. [docs/l2_foundation/foundation.md](docs/l2_foundation/foundation.md) — 全体アーキテクチャ
3. [docs/l2_foundation/screens/](docs/l2_foundation/screens/) + [features/screens/](docs/l2_foundation/features/screens/) — 該当画面の UX カタログ / 機能契約
4. [docs/l2_foundation/lessons.md](docs/l2_foundation/lessons.md) — 過去の失敗 / 再発防止 (メタ教訓のみ、個別 bug は git log)

## 迷ったら (routing)

| 状況                                                    | 読む doc                                 |
| ------------------------------------------------------- | ---------------------------------------- |
| 製品の範囲 / scope 判断                                 | `docs/l0_ideas/motivation.md`            |
| 設計判断 / 技術選定 / レイヤー / IPC / state / error    | `docs/l2_foundation/foundation.md`       |
| 該当画面の挙動 / 機能カタログ                           | `docs/l2_foundation/screens/<screen>.md` |
| feature の機能契約 (やる / やらない / 性能予算)         | `docs/l2_foundation/features/**`         |
| 要件 (REQ-NNNN) / release 判定 / UX 標準 / design token | `docs/l1_requirements/vision.md`         |
| dispatch / release / support / widget 追加手順          | `docs/l1_requirements/operations.md`     |
| test 要件 / scenario                                    | `docs/l2_foundation/test_scenarios.md`   |
| 過去の失敗 / 再発防止                                   | `docs/l2_foundation/lessons.md`          |
| 完了済 plan 参照                                        | `docs/l3_phases/_archive/`               |

## LLM navigation index (repo の entry point)

### L0 — 要求 / 動機 (stable layer)

- [`docs/l0_ideas/motivation.md`](docs/l0_ideas/motivation.md) — なぜ / 何 / 誰 / Non-goals / 成功条件 / 制約 / 利用形態 / 失敗パターン / ビジュアル参照

### L1 — 要件

- [`docs/l1_requirements/vision.md`](docs/l1_requirements/vision.md) — 機能要求 (REQ-NNNN) + 非機能 + 制約 + Release 判定基準 + UX 標準 + Design System overview
- [`docs/l1_requirements/operations.md`](docs/l1_requirements/operations.md) — Dispatch rules + Release process (rollback / pubkey / cosign) + Support + Widget 追加 checklist
- [`RELEASE.md`](RELEASE.md) — リリース手順 runbook (version bump → tag → workflow → publish、tier / 署名 / 自動更新の実務)

### L2 — 基本設計

- [`docs/l2_foundation/foundation.md`](docs/l2_foundation/foundation.md) — アーキテクチャ / 技術 stack / レイヤー / IPC / state / error / schema / dirs / 設計判断 / 非機能 / CI/CD / 用語
- [`docs/l2_foundation/screens/`](docs/l2_foundation/screens/) — 画面別 UX / IA カタログ (palette / library / workspace / settings / onboarding / activity)
- [`docs/l2_foundation/features/`](docs/l2_foundation/features/) — feature / module の機能契約 (7 section、「やらないこと」で事故防止)
- 規範本体: [`design-tokens.md`](docs/l2_foundation/design-tokens.md) (token 体系) / [`i18n-policy.md`](docs/l2_foundation/i18n-policy.md) (文言判定) / [`button-usage.md`](docs/l2_foundation/button-usage.md) (variant 選択)
- [`docs/l2_foundation/test_scenarios.md`](docs/l2_foundation/test_scenarios.md) — テストシナリオ ⇄ 実装 link
- [`docs/l2_foundation/lessons.md`](docs/l2_foundation/lessons.md) — 失敗駆動メモリ

### L3 — 実装計画

- [`docs/l3_phases/_archive/`](docs/l3_phases/_archive/) — 完了済 plan
- [`docs/l3_phases/_template/use-case-audit.md`](docs/l3_phases/_template/use-case-audit.md) — Heuristic + Cognitive Walkthrough 雛形

## 他プロジェクト / memory

本 repo は独立 module。外部 monorepo / parent repo に依存しない。
永続 memory は repo 外 (`$USERPROFILE\.claude\projects\<repo-slug>\memory\`)、session 跨ぎで参照
(詳細は `memory/MEMORY.md`)。
