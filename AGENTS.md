# Arcagate — Agent Map (session 開始時の道しるべ)

PC 上に散在する起動元 (Steam / DMM ゲーム / ブラウザゲーム / 開発ツール / スクリプト / URL …) を
1 箇所に集約する個人用ランチャー。Windows 単独 user / ローカル完結 / 配布水準を常に狙う daily-use ツール。
V2 で「起動後の時間」を記録する低負荷パーソナル活動トラッカーを足す。
技術: Tauri v2 + SvelteKit (Svelte 5 runes) + Tailwind v4 + shadcn-svelte + Rust + rusqlite (SQLite)。

**このファイルは地図 (Map / Router)。中身は持たない。**「何がどこにあるか」「どの指示ならどこを読むか」
だけを示し、詳細 (規約・仕様・数値) は各正本 doc へ導く。読むべき先へ飛べたら役目は終わり。

## doc システムの構造 (SSOT + 遅延ロード)

3 層で「必要な文脈を必要な時にだけ」届ける:

- **AGENTS.md (本ファイル、root)** = 全体地図。session 開始時にロード。`CLAUDE.md` は `@AGENTS.md` で委譲するだけ
- **各フォルダの `CLAUDE.md`** = その領域の局所地図。**そのフォルダで作業する時に遅延ロード**される
  (例: `src-tauri/CLAUDE.md` / `src/CLAUDE.md` / `docs/CLAUDE.md`)。常時全部は読ませない
- **正本 doc** (`docs/` 各層 + `.claude/rules/`) = 中身の本体

**SSOT 原則**: ある事実 / ルール / 仕様は **1 つの正本にだけ書く**。他 doc はコピーせず参照 / リンクで導く。
重複を見つけたら正本を 1 つ決め、残りは参照に置き換える。

## doc マップ (何がどこに)

| 層          | 場所                                                                                   | 正本の内容                                                                           |
| ----------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **L0** 要求 | [`docs/l0_ideas/motivation.md`](docs/l0_ideas/motivation.md)                           | なぜ / 何 / 誰 / Non-goals / 成功条件 / 制約 / 失敗パターン / ビジュアル参照         |
| **L1** 要件 | [`docs/l1_requirements/vision.md`](docs/l1_requirements/vision.md)                     | 機能要求 (REQ-NNNN) / release 判定 / **UX 標準・perf 予算・motion token (数値正本)** |
|             | [`docs/l1_requirements/operations.md`](docs/l1_requirements/operations.md)             | dispatch / release (rollback / pubkey / cosign) / support / widget 追加手順          |
| **L2** 設計 | [`docs/l2_foundation/foundation.md`](docs/l2_foundation/foundation.md)                 | アーキ / レイヤー / IPC / state / error / schema 設計 / dirs / 設計判断              |
|             | [`docs/l2_foundation/features/`](docs/l2_foundation/features/)                         | feature の機能契約 (backend / widgets / cross-cutting / screens、7 section)          |
|             | [`docs/l2_foundation/screens/`](docs/l2_foundation/screens/)                           | 画面別 UX / IA カタログ (契約は features/screens/)                                   |
|             | design-tokens.md / i18n-policy.md / button-usage.md                                    | token 体系 / 文言判定 / button variant (各領域の正本)                                |
|             | test_scenarios.md / lessons.md                                                         | テスト ⇄ 実装 link / 失敗の再発防止                                                  |
| **L3** 計画 | [`docs/l3_phases/_archive/`](docs/l3_phases/_archive/)                                 | 完了済 plan (履歴)                                                                   |
| **rule**    | [`.claude/rules/engineering.md`](.claude/rules/engineering.md)                         | 設計の固定枠 (レイヤー / DB / error / ORM) + 禁止事項 (color hardcode 等)            |
|             | [`.claude/rules/workflow.md`](.claude/rules/workflow.md)                               | 完了基準 / 調査規律 / 開発ルーチン / branch / agent 運用 / 暴走ブレーキ              |
| **入口**    | [`README.md`](README.md) / [`RELEASE.md`](RELEASE.md) / [`CHANGELOG.md`](CHANGELOG.md) | 製品概要・利用/開発の入口 / release 手順 / 変更履歴 (削除・移設の記録先)             |

## ルーティング (この指示なら → ここを読む)

| タスク種別                                                        | 参照先 (正本)                                                                    |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| backend service の仕様                                            | `docs/l2_foundation/features/backend/<name>.md`                                  |
| widget の仕様                                                     | `docs/l2_foundation/features/widgets/<name>.md`                                  |
| 画面の見た目 / 操作 / シナリオ                                    | `docs/l2_foundation/screens/<screen>.md` (契約は `features/screens/<screen>.md`) |
| 横断機能 (i18n / persistence / security / auto-update / 権限分離) | `docs/l2_foundation/features/cross-cutting/`                                     |
| 設計判断 / レイヤー / IPC / state / error / schema                | `docs/l2_foundation/foundation.md`                                               |
| 設計の固定枠・禁止事項 (やってはいけない)                         | `.claude/rules/engineering.md`                                                   |
| 作業規律 / 完了基準 / dev routine / branch                        | `.claude/rules/workflow.md`                                                      |
| design token (色 / radius / shadow / surface)                     | `docs/l2_foundation/design-tokens.md`                                            |
| 文言・icon-only 判定                                              | `docs/l2_foundation/i18n-policy.md` / `button-usage.md`                          |
| 要件 / release 判定 / perf 予算 / UX 標準の数値                   | `docs/l1_requirements/vision.md`                                                 |
| dispatch / release / support / widget 追加手順                    | `docs/l1_requirements/operations.md`                                             |
| test 要件 / scenario                                              | `docs/l2_foundation/test_scenarios.md`                                           |
| 過去の失敗 / 再発防止                                             | `docs/l2_foundation/lessons.md`                                                  |

## コマンド (最低限、詳細は各正本)

- **開発**: `pnpm app:dev` (隔離起動・推奨) / `pnpm verify` (全検証) / `pnpm test:e2e` (**user 許可制**)。
  詳細・注意は [`.claude/rules/workflow.md`](.claude/rules/workflow.md)
- **CLI**: `arcagate_cli` を Agent tool / Skill 経由で直呼びする (MCP は持たない、CLI が単一連携経路)。
  活動クエリ / 抽出 / テンプレート / 分類は [`features/backend/activity-cli.md`](docs/l2_foundation/features/backend/activity-cli.md)
- **release**: 手順 runbook は [`RELEASE.md`](RELEASE.md)

## 進め方 (要点、詳細は [`.claude/rules/workflow.md`](.claude/rules/workflow.md))

- 完了は実機目視 + user dev 検収で確定 (`dom-not-fixed`)。`pnpm verify` pass ≠ 治った
- 不整合を 1 つ見つけたら横展開 audit (`lateral-sweep`)。1 file 直して終わりにしない
- user に dev 起動 / dump / 動作確認を依頼しない。agent dev で完結 (`agent-self-complete`)
- PR は serial (1 つ merge → user 検収 → 次)。迷ったら上の routing table

## memory / 他プロジェクト

本 repo は独立 module (外部 monorepo に依存しない)。永続 memory は repo 外
(`$USERPROFILE\.claude\projects\<repo-slug>\memory\`)、session 跨ぎで参照 (`memory/MEMORY.md`)。
