# Script Folder Watch Widget

> widgetType: `script_folder` / category: watch / 配置画面: [Workspace](../screens/workspace.md)

## 目的

監視フォルダ配下のシェルスクリプト (.bat / .cmd / .ps1 / .sh / .py 等) を列挙・実行する widget。実行前確認ダイアログを security gate として持つ。

## やること (必要処理)

- `cmd_scan_script_folder` で allowlist 拡張子のスクリプトを列挙 (scan_depth 1-3、stale response 破棄)
- `cmd_run_script` でスクリプトを実行。初回は backend が `ConfirmationRequired` を返し、確認ダイアログ → `cmd_confirm_script` → 再実行
- sort (name / mtime)
- watch_path / scan_depth 変更で即 scan

## やらないこと (禁止 / scope 外)

- スクリプトを自動実行しない (必ず user click + 確認)
- 確認ダイアログを無効にする時も backend の allowlist / path 検証は迂回しない
- スクリプト本体を編集しない (列挙・実行のみ)
- 出力をキャプチャ・表示しない (起動のみ)

## 性能予算

- 初回 scan は depth 最大 3 のフォルダ walk。scanRequestId で race 防止
- 実行は外部 process spawn (widget は待たない)

## 副作用 (state 変化 / persistence)

- 外部 process を起動 (backend 経由)
- widget config (`watch_path` / `scan_depth` / `title` / `description` / `confirm_before_run` / `sort_field` / `sort_order`) を保存

## 依存

- IPC: `cmd_scan_script_folder` / `cmd_run_script` / `cmd_confirm_script`
- config schema: `watch_path` / `scan_depth` (1-3) / `confirm_before_run` (bool) / `title` / `description` / `sort_field` / `sort_order`
- backend: [Script Runner Service](../backend/script-runner.md)
- cross-cutting: [Security Model](../cross-cutting/security-model.md)

## 既知の判断

- 実行前確認は default ON。Settings で OFF 可だが、backend 側の初回 confirm gate / 拡張子 allowlist / path confinement は常に有効 (PR #508 で追加)
