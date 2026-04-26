---
id: PH-20260426-361
status: todo
batch: 81
type: 改善
---

# PH-361: ExeFolderWatchWidget cmd_open_path spy e2e（batch-80 PH-357 持越）

## 横展開チェック実施済か

- batch-74 で `launchItem('exe-folder:...')` → `invoke('cmd_open_path', ...)` 修正済
- e2e カバレッジが未追加で「修正したけど検証してない」状態

## 仕様

`tests/e2e/exe-folder-launch.spec.ts` に @nightly テスト 1 件:

- tempdir に exe + 任意の ico を作成（test setup）
- ExeFolderWatchWidget を含む workspace を表示、widget config に `watch_path` を tempdir で設定
- entry button をクリック
- `page.evaluate` で `window.__TAURI_INTERNALS__.invoke` を spy 化、`cmd_open_path` が tempdir 配下の exe path で呼ばれたか検証
- 実 spawn は呼ばないようモック

## 受け入れ条件

- [ ] @nightly テスト 1 件 pass
- [ ] cmd_open_path が正しい path で呼ばれたことを spy で確認
- [ ] `pnpm verify` 全通過
