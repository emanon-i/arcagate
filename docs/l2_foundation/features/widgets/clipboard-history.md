# Clipboard History Widget (クリップボード履歴)

> widgetType: `clipboard_history` / category: tool / 配置画面: [Workspace](../screens/workspace.md)

## 目的

システムクリップボードの変更を監視して履歴を保持し、過去にコピーしたテキストを再コピーできる widget。

## やること (必要処理)

- clipboard を `poll_interval_ms` 間隔で polling (default 1500ms、最小 500ms)
- 新しいテキストを履歴に追加 (max_items 上限)
- 入力で履歴を case-insensitive 部分一致フィルタ
- 履歴 entry click で再コピー、entry 削除

## やらないこと (禁止 / scope 外)

- 画像 / ファイル等の非テキストクリップボードを保持しない (text のみ)
- 履歴を DB / file に書かない (config JSON にのみ保存)
- poll 間隔を 500ms 未満にしない (heavy polling 防止)
- クリップボードへの自動書き込みをしない (再コピーは user click 時のみ)

## 性能予算

- polling 間隔 default 1500ms / 最小 500ms。複数 widget 配置時は累積に注意
- 履歴は in-memory + config 保存

## 副作用 (state 変化 / persistence)

- widget config (`max_items` / `poll_interval_ms` / `title` / `history[]`) を `workspace_widgets.config` JSON に保存
- clipboard への書き込み (再コピー操作時)

## 依存

- IPC: clipboard plugin の `readText` / `writeText` (`tauri-plugin-clipboard-manager`)
- config schema: `max_items` (1-200, default 20) / `poll_interval_ms` (500-10000, default 1500) / `title` / `history: { id, text, addedAt }[]`
- backend: clipboard plugin (専用 service なし)

## 既知の判断

- ⚠️ clipboard 権限取得失敗時は silent catch。デバッグ性のため log 追加は別 issue 候補
