---
id: PH-20260427-404
status: done
batch: 89
type: 整理
era: Polish Era
---

# PH-404: 整理 + batch-90 Use Case Audit 5 plan 提案 + Distribution Era 候補

## 完了ノート（batch-89）

batch-89 で消化:

- PH-400 deferred (Rule A 適用)
- PH-401 done (LoadingState rollout)
- PH-402 deferred (実機計測ユーザ承認制)
- PH-403 done (Polish Era 完走判定 → 未完走、batch-90 後再判定)
- PH-404 done (本書)

## batch-90 Use Case Audit 5 plan 提案

ユーザ判断（2026-04-27、`memory/arcagate_product_direction.md`）:「Use Case Realignment フェーズを Polish Era 完走と Distribution Era 起動の間に挟む」。

5 plan 構成（Rule A/B/C 適用、想定ベース禁止、Codex 相談必須）:

- **PH-405 想定ユーザケース 10 件記述**（`docs/l1_requirements/use-cases.md`）: ゲーム起動 / 同人ゲームライブラリ / プロジェクト開始 / 日次月次タスク / フォルダ整理 / クリップボード再利用 / メモ・アイデア / 検索ファイル探し / 設定変更 / テーマ切替
- **PH-406 各ケース walkthrough**（CDP + 実機目視）: 現状フロー + 摩擦点リスト化 → `docs/l2_architecture/use-case-friction.md`
- **PH-407 摩擦解消優先順位付き候補 Plan 化**: 各摩擦に対し micro fix / 機能追加 / 構造再設計の 3 段階で分類
- **PH-408 主要ケース E2E user journey テスト追加**（@core 5 件以下、CI で安定動作するもの）
- **PH-409 不要 / 重複機能洗い出し** + batch-91 提案（Audit 結果ベース）

## Distribution Era 候補（batch-91+ or batch-92+）

Use Case Audit 結果次第で順序変動。原案維持:

- **PH-410** コード署名（Windows Authenticode）
- **PH-411** エラー境界 UI
- **PH-412** バックアップ UI（DB export / import）
- **PH-413** アップデート機構（Tauri updater）
- **PH-414** 整理 + 配布リリース判断

## Restructure Era 余地

batch-90 PH-407 で「画面構成自体がダメ」と判定された場合、ユーザ承認後 Restructure Era（batch-91〜93）を挟む権限あり（`feedback_no_speculation_planning.md` Rule A 適用、Codex 相談必須）。

## 参照した規約

- batch-88 PH-399 で Distribution Era 5 plan 候補（PH-405〜409）を予告
- 本バッチで正式に Distribution Era 起動 plan を作成

## 仕様

### batch-89 完走記録

dispatch-log + polish-era-progress.md 更新。

### Distribution Era 5 plan 作成

`docs/l3_phases/PH-20260428-405〜409_*.md`:

- **PH-405** コード署名（Windows Authenticode）
- **PH-406** エラー境界 UI（unrecoverable error 時の「再起動」表示）
- **PH-407** バックアップ UI（DB export / import の Settings UI 化）
- **PH-408** アップデート機構（Tauri updater 設定）
- **PH-409** 整理 + 配布リリース判断

### Polish Era 完走 ✅ → Distribution Era 起動

memory `arcagate_product_direction.md` の Era 状態を更新:

```
- Refactor Era: 完走 (batch-82〜85)
- Polish Era: 完走 (batch-86〜89)
- Distribution Era: 起動 (batch-90〜)
```

## 受け入れ条件

- [ ] dispatch-log に batch-89 完走 + Polish Era 完走宣言
- [ ] polish-era-progress.md に最終サマリ
- [ ] Distribution Era 5 plan ファイル作成（PH-405〜409）
- [ ] memory `arcagate_product_direction.md` 更新
- [ ] `pnpm verify` 全通過
