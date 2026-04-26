---
id: PH-20260426-325
status: todo
batch: 74
type: 改善
---

# PH-325: ExeFolderWatchWidget launchItem 経由バグ修正

## 横展開チェック実施済か

- batch-72 で発見（chip task として spawn 済、本 Plan で吸収）
- 同種パターン audit: `launchItem(\`virtual:...\`)` 形式の他箇所 grep
- batch-72 で追加した `cmd_open_path` を再利用

## 仕様

- `ExeFolderWatchWidget.svelte` の `launchItem('exe-folder:${exePath}')` を `invoke('cmd_open_path', { path: exePath })` に置換
- DB 経由 `find_by_id` で NotFound になっていた pre-existing バグを修正
- 「起動しました」toast の .then ブランチが正しく発火するようになる
- 横展開: 他に `launchItem(\`<prefix>:` パターンを使っているコードがないか grep で確認

## 受け入れ条件

- [ ] ExeFolderWatchWidget で exe 起動 → 成功 toast が出る
- [ ] grep で `launchItem.*\`[a-z_]+:` パターンが ExeFolderWatchWidget 以外にないこと確認
- [ ] `pnpm verify` 全通過
