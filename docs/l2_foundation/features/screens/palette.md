# Palette 画面

> Functional Spec。機能契約のみ記載。詳細な機能カタログは [`../../screens/palette.md`](../../screens/palette.md)。

## 目的

最速起動経路。どの画面にいても `Ctrl+Shift+Space` で呼び出し、名前を打って Enter で実行する floating window。tray 常駐で desktop のどこからでも起動できる。

## やること (必要処理)

- グローバルホットキー / tray icon click で floating window を表示
- 入力で label / aliases の fuzzy match 検索
- 空 query 時は frecency (recency + frequency) 順の default 候補表示
- ↑↓ で result 移動、Enter で起動 (LaunchService cascade resolve)
- Tab で Quick context (選択中 item の preview) へ focus
- Ctrl+H で非表示 item を含めて表示、Ctrl+K でアクション menu
- special prefix: `:dev` (開発ツール filter) / `=` (計算機) / `>` (内蔵 command)
- Esc または palette 外 click で close

## やらないこと (禁止 / scope 外)

- 検索対象を Library 登録 item に限定する (Everything 系の全 FS semantic 検索はしない)
- multi-line input をしない (1 line input + 1 line action)
- 外部 web search をしない
- item 起動・OS アクセスを frontend でしない (backend 経由)
- 別 window のため main window 状態に依存しない (main window 非表示でも単独動作)

## 性能予算

- ホットキー押下 → 表示 P95 ≤ 120ms (preload + webview 隠し表示)
- 検索入力 → 候補反映 < 100ms
- item 起動 P95 ≤ 200ms (log 記録は非同期)

## 副作用 (state 変化 / persistence)

- 起動時に `launch_log` へ記録 + item 統計更新 (backend)
- palette 自体の永続 state なし (query / 選択は揮発)

## 依存

- IPC: `cmd_search_items` / `cmd_launch_item` / `cmd_get_frecency_items` / `cmd_open_path`
- plugin: `tauri-plugin-global-shortcut` / tray-icon
- backend: [Item Service](../backend/item-service.md) / [Launcher](../backend/launcher.md)
- 依存される: なし (独立 window)

## 既知の判断

- 別 webview window (`src/routes/palette/+page.svelte`)。main window と process は共有、DOM は独立
- 計算機 (`=`) / 内蔵 command (`>`) は frontend 完結 (OS / DB に触れない範囲)
