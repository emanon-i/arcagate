# Workspace 画面

> Functional Spec。機能契約のみ記載。詳細な機能カタログは [`../../screens/workspace.md`](../../screens/workspace.md)。

## 目的

widget を無限 canvas に自由配置できる画面。複数 page (タブ) でシナリオ別の launcher pad (Gaming / Dev / Daily 等) を作る。

## やること (必要処理)

- multi-page タブの切替 / 作成 / rename / 削除 / 壁紙設定
- 編集 mode で sidebar の widget palette を表示し、palette から canvas へ D&D 配置
- 配置済 widget の grid 描画、8 方向 resize / move、overlap reject + spiral 探索で最寄り空きセルへ着地
- canvas の pan (中ボタン / Space+左 / shift+wheel)、zoom (1%〜250%)、fit-to-content
- widget の single / shift / Ctrl+A / box 選択、Delete で一括削除
- per-workspace の Undo / Redo (add / remove / move / resize / config update を 1 entry)
- widget body 右クリックの共通 context menu
- 壁紙画像 (path + opacity + blur) を per-workspace で適用

## やらないこと (禁止 / scope 外)

- multi-monitor 配置をしない (1 main window 内のみ)
- widget 同士の overlap を許可しない (重ね置き禁止)
- widget の inter-workspace 移動をしない (削除 + 別 workspace 再配置)
- 1 widget の cross-workspace 共有をしない (各 workspace 独立 config)
- widget 自体の処理 (polling / file scan 等) は各 widget spec の責務。Workspace 画面は配置・描画・入力のみ
- canvas 上で重い同期処理をしない (全 widget 一斉再計算で frame drop させない)

## 性能予算

- 入力 → 視覚反応 < 100ms (drag / resize / zoom / pan)
- workspace 切替 / page 切替時に全 widget の同期 IPC を一斉発火させない

## 副作用 (state 変化 / persistence)

- `workspaces` / `workspace_widgets` テーブルへ CRUD
- 壁紙画像を `%APPDATA%/wallpapers/<uuid>.<ext>` に copy
- widget 削除時の cascade: `widget_item_hides` 連動削除、watched_path 連動、Library item 連動
- Undo/Redo history は in-memory (workspace 切替で clear)

## 依存

- IPC: `cmd_create_workspace` / `cmd_delete_workspace` / `cmd_update_workspace` / `cmd_list_workspaces` / `cmd_add_widget` / `cmd_remove_widget` / `cmd_list_widgets` / `cmd_update_widget_position` / `cmd_update_widget_config` / `cmd_save_wallpaper_file` / `cmd_set_workspace_wallpaper` / `cmd_add_watched_path` / `cmd_remove_watched_path`
- backend: [Workspace Service](../backend/workspace-service.md) / [Wallpaper Service](../backend/wallpaper-service.md)
- widget registry: `src/lib/widgets/index.ts` (auto-collect)、各 widget spec は [`../widgets/`](../widgets/)
- 依存される: なし (top-level 画面)

## 既知の判断

- `Mutex<Connection>` 前提のため widget config 更新は逐次。bulk 一括更新はしない設計
- ClockWidget は 4 回改修しても体感品質が改善せず廃止済 (lessons.md、migration 021)
