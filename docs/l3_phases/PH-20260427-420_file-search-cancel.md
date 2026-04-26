---
id: PH-20260427-420
status: todo
batch: 93
type: 改善
era: UX Audit Re-Validation Round 2
---

# PH-420: ファイル検索 cancel + 進捗可視化（Nielsen H3 / H1）

## 問題

batch-92 PH-415 v2 audit で **ケース 8 (ファイル検索) の H3 = severity 3** と判定:

- 巨大ディレクトリで FileSearch widget の検索を開始すると停止できない
- スキャン中の進捗インジケータがない (H1 severity 2)
- Raycast / Spotlight / Everything 等の business-grade ツールでは中断可能が標準

Codex Rule C 再 review (2026-04-27) で **batch-93 最優先 (Q4 推奨順位 #1)** と判定。

## 改修

### Rust 側

`src-tauri/src/commands/file_search_commands.rs` の `cmd_search_files` (or 該当関数):

1. **CancellationToken 導入**: `tokio_util::sync::CancellationToken` をリクエストごとに発行
2. **walkdir ループに cancel check**: 各ディレクトリエントリ評価前に `token.is_cancelled()` を check、中断なら早期 return
3. **`cmd_cancel_file_search`**: 進行中の検索 ID を取り消す IPC 追加
4. **進捗 event**: `Tauri Manager.emit_all` で「進行中: N 件処理中」を 100ms 間隔で push

### フロント側

`src/lib/widgets/file-search/FileSearchWidget.svelte`:

1. **検索開始時に「中止」ボタン表示**: 「検索中... (X 件処理中) [中止]」
2. **中止ボタン → cmd_cancel_file_search invoke**: トースト「検索を中止しました」
3. **search_id 管理**: 同時に 1 検索のみ、新しい検索開始時に古い検索を自動 cancel
4. **進捗 event listener**: `listen('file-search-progress', ...)` で UI 更新

### CancellationToken 戦略

- 戦略: グローバルな `Mutex<HashMap<String, CancellationToken>>` を `AppState` に保持
- search_id は UUIDv7 (時刻順)
- 完了 / cancel 時に HashMap から削除

## 解決理屈

- Codex 推奨順位 #1、Nielsen H3 (User control and freedom) の業界標準対応
- batch-92 PH-415 v2 case 8 の severity 3 解消 (12 件中 1 件)
- 「公開できる品質」の前提条件 — ユーザが操作を止められないツールは配布不可

## メリット

- 巨大ディレクトリ検索後の "stuck" UX を解消
- 業界標準 (Raycast / Everything) と同等の cancel 体験
- バックグラウンド処理が無駄に CPU を食わない (early return)

## デメリット

- AppState に `Mutex<HashMap>` 追加 = 状態管理複雑度↑
- 既存 walkdir ループへの cancel check 注入で performance 微減 (無視レベル)
- e2e テストで cancel 競合状態の検証は flaky 懸念 → unit test 中心

## 受け入れ条件

- [ ] `cmd_cancel_file_search` IPC 追加、`cmd_search_files` に cancel check
- [ ] AppState に `cancellation_tokens: Mutex<HashMap<String, CancellationToken>>` 追加
- [ ] search ID (UUIDv7) 発行、新規検索時に古い検索を自動 cancel
- [ ] 進捗 event `file-search-progress` で N 件処理中を push
- [ ] `FileSearchWidget.svelte` に「検索中... [中止]」UI
- [ ] cancel 単体テスト 3 ケース (cancel→Result::Err / 自動 cancel / 完了後 cancel は no-op)
- [ ] `pnpm verify` 全通過

## SFDIPOT 観点

- **F**unction (機能): cancel が確実に途中で walkdir を止める
- **T**ime (時間): cancel 応答時間 < 200ms
- **O**perations (運用): 同時複数検索が起きないよう排他

参照: `docs/l2_architecture/use-case-friction-v2.md` case 8 / `docs/l1_requirements/ux-research/codex-review-batch-92.md` Q4
