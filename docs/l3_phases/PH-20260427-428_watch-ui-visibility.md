---
id: PH-20260427-428
status: todo
batch: 94
type: 改善
era: UX Audit Re-Validation Round 3
---

# PH-428: watch UI 可視化 (Codex Q5 #2)

## 問題

batch-93 PH-421 で silent failure DB 整合は修正したが、フロント UI で監視状態 / エラーが見える化されていない。
Codex Q5 #2: ユーザがフォルダ追加 + 失敗時のフィードバックが必要。

## 改修

- 取り込みフォルダ管理 UI を Settings > Library section に新設
- WatchedPath 一覧 + addWatchedPath ダイアログ + remove ボタン
- addWatchedPath catch で formatIpcError → toast「フォルダ監視に失敗しました: <path>」
- 監視状態バッジ (現状は simple Active のみ、Failed ステータスは別 plan):
  - 🟢 active (初版はこれのみ)
- Failed 状態の永続化は別 plan で (DB schema 拡張要)

## 受け入れ条件

- [ ] Settings > Library に「取り込みフォルダ」section 追加
- [ ] WatchedPath 一覧表示 (cmd_get_watched_paths)
- [ ] フォルダ追加ダイアログ (open() で picker → cmd_add_watched_path)
- [ ] 失敗時 toast「フォルダ監視に失敗しました: <path>」(formatIpcError 経由)
- [ ] remove 確認 dialog + cmd_remove_watched_path
- [ ] e2e 追加 (空状態 / 追加 / 失敗パス追加)
- [ ] `pnpm verify` 全通過
