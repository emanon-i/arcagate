# File Search Widget (ファイル検索)

> widgetType: `file_search` / category: tool / 配置画面: [Workspace](../screens/workspace.md)

## 目的

指定 root フォルダ配下のファイルを列挙し、ファイル名で絞り込んでキーボードで素早く開く widget。

## やること (必要処理)

- root / depth / limit で `cmd_list_files` を呼びファイル一覧を取得 (stale response 破棄)
- query で client-side のファイル名 filter (case-insensitive substring、最大 50 件表示)
- ↑↓ で選択移動、Enter で開く (IME 確定中は無視)
- 登録済 item は cascade 起動、未登録は `cmd_open_path`
- cancel button で `cmd_cancel_file_search`

## やらないこと (禁止 / scope 外)

- ファイル内容を検索しない (ファイル名のみ)
- glob / 正規表現検索をしない (単純 substring)
- depth を 3 より深くしない、limit を上限超で取得しない
- scan を frontend で実行しない (backend に委譲、cancel 可能)
- ファイル名以外のソート / インデックス構築をしない

## 性能予算

- scan は backend、depth 最大 3 / limit 最大 2000。searchId で cancel 可能
- client filter は最大 50 件表示で軽量
- resize 時に entries が reset しないよう prevRoot / prevDepth / prevLimit で抑制

## 副作用 (state 変化 / persistence)

- widget config (`root` / `depth` / `limit` / `title`) を `workspace_widgets.config` JSON に保存
- 読み取り専用 (ファイル列挙のみ)

## 依存

- IPC: `cmd_list_files` / `cmd_cancel_file_search` / `cmd_launch_item` / `cmd_open_path`
- config schema: `root` / `depth` (1-3, default 2) / `limit` (10-2000, default 200) / `title`
- backend: [File Search Service](../backend/file-search-service.md)

## 既知の判断

- backend が `.git` / `node_modules` / `target` / dotfile を自動スキップ
