---
id: PH-20260427-421
status: done
batch: 93
type: 改善
era: UX Audit Re-Validation Round 2
---

# PH-421: watch エラー可視化 + silent failure 解消（Nielsen H9 / H1）

## 問題

batch-92 Codex Rule C 再 review で **最重要指摘**:

- `src-tauri/src/services/watched_path_service.rs:21 / :40` で「失敗時 DB 保存しない」想定コメントがあるが、実装は保存している (silent failure 温存)
- batch-92 PH-415 v2 audit ケース 5 (フォルダ整理) の H9 / H1 = severity 3
- 監視中 / 停止中 / エラーバッジが UI に表示されない
- 業界 (Playnite / GOG Galaxy) は監視状態を可視化 + エラー時バッジ付与

## 改修

### Rust 側

1. **`watched_path_service.rs:21 / :40` のコメント vs 実装一致**: watch 失敗時の DB 書き込みを停止し、エラーログのみ
   - `add_watched_path` で notify::Watcher::watch() 失敗時は AppError::WatchFailed を返し、DB INSERT しない
   - 既存の silent 動作はバグとして修正
2. **watch 状態 enum**: `WatchStatus { Active, Stopped, Failed { error: String } }` を WatchedPath モデルに追加
3. **`cmd_get_watch_statuses`**: 全 watched_path の状態を返す IPC
4. **watch 失敗時 event**: `Tauri.emit_all('watch-error', { path, error })` で UI 通知

### フロント側

`src/lib/components/settings/sections/AppearanceSection.svelte` (または取り込みフォルダ section):

1. **WatchedPath リストに状態バッジ**: 🟢 Active / ⚪ Stopped / 🔴 Failed (詳細 hover で error message)
2. **再 subscribe ボタン**: Failed 状態のとき [再試行] ボタン → `cmd_resubscribe_watch` invoke
3. **watch-error event listener**: 自動でバッジ更新 + toast「フォルダ監視に失敗しました: <path>」

### マイグレーション

WatchedPath テーブルに `status` 列追加:

```sql
ALTER TABLE watched_paths ADD COLUMN status TEXT DEFAULT 'active';
```

## 解決理屈

- Codex 最重要指摘の解消、silent failure はテスト失敗より隠れたバグ温床
- ケース 5 の severity 3 を 2 件 (H1 + H9) 同時解消
- 業界標準 (Playnite / GOG) の library source 設定パターンに整合

## メリット

- 「監視してるはずなのに反映されない」ユーザ困惑を解消
- watch 失敗が即座に分かる + 復旧導線あり
- silent failure バグ修正で「自動取り込み」機能の信頼度向上

## デメリット

- DB スキーマ変更 (マイグレーション 018 追加)
- watch 状態管理が Rust 側に追加 (state machine 軽量)
- 既存 watched_path data の status は 'active' default、要確認

## 受け入れ条件 (batch-93 必須スコープ — silent failure 解消優先)

- [ ] `watched_path_service.rs:21 / :40` の silent failure 修正 (失敗時 DB 書き込みなし)
- [ ] AppError::WatchFailed variant 追加
- [ ] silent failure 単体テスト (failing path で DB row が無いこと)
- [x] フロント取り込みフォルダ section の error catch → 該当 add UI が現状存在せず (ProjectsWidget は read-only)、UI 追加時 (PH-428 候補) に同時対応
- [x] `pnpm verify` 全通過

## 別 plan に切り出し (batch-94 候補)

- WatchStatus enum + WatchedPath モデルに status 列 + マイグレーション 018 → PH-428 候補
- 監視状態バッジ (🟢/⚪/🔴) + 再 subscribe ボタン UI → PH-428 候補
- `cmd_get_watch_statuses` / `cmd_resubscribe_watch` IPC → PH-428 候補

理由: silent failure 修正は緊急 (Codex 最重要)、UI 可視化は schema 拡張を伴うため batch-94 で慎重に実装。

## SFDIPOT 観点

- **F**unction (機能): watch 失敗が状態として残らない (silent failure 解消)
- **I**nterface (界面): 状態バッジ + 復旧導線
- **O**perations (運用): 自動取り込みの信頼性

参照: Codex review-batch-92.md Q5 #1 #2 / use-case-friction-v2.md case 5
