# Workspace (ワークスペース)

widget を自由配置できる canvas 画面。 複数 page (タブ) でシナリオ別 launcher pad を作る (Gaming page、 Dev page、 Daily page など)。

route: `src/routes/+page.svelte` の `activeView === 'workspace'` 分岐

---

## 何があるか

| 要素                   | 内容                                                                |
| ---------------------- | ------------------------------------------------------------------- |
| Page tab bar           | workspace 切替 + rename + wallpaper 設定                            |
| Sidebar (編集 mode 時) | widget palette、 category 別 (library / watch / memo / tool / info) |
| Canvas                 | 無限スクロール (BUFFER_COLS / BUFFER_ROWS) + zoom + pan             |
| Widget grid            | 配置済 widget の grid 描画、 D&D resize / move 対応                 |
| Toolbar (右下)         | Undo / Redo / zoom% / Reset / Fit-to-content                        |
| Wallpaper              | 背景画像 + opacity + blur (per-workspace)                           |

実装場所:

- `src/lib/components/arcagate/workspace/WorkspaceLayout.svelte` (root facade)
- `WorkspaceGrid.svelte` (canvas + scroll + pan)
- `WorkspaceWidgetGrid.svelte` (widget render + interactions)
- `WorkspaceSidebar.svelte` / `PageTabBar.svelte` / `WorkspaceRenameDialog.svelte` / `WorkspaceWallpaperDialog.svelte`
- state: `src/lib/state/workspace.svelte.ts` (facade) → `workspace-widgets.svelte.ts` / `workspace-config.svelte.ts` / `workspace-input.svelte.ts` / `workspace-history.svelte.ts` / `workspace-selection.svelte.ts` / `widget-zoom.svelte.ts`

---

## 機能

### Page 操作

- multi-page タブ (workspace = page)、 click で切替
- right-click タブ → rename / delete / wallpaper 設定
- 新規 page 作成 (Home auto-create)

### Widget 配置

- 編集 mode で Sidebar palette 表示
- palette から widget を canvas に D&D
- 既存 widget をどこに置く時は `cellClusterAnchor` で既存 cluster 中心近傍に着地
- 配置済 widget は 8 方向 resize handle + drag handle
- overlap 自動 reject、 spiral 探索で最寄り空きセル
- widget 削除で workspace_widgets DROP + cascade (`watched_path` 連動 / Library item 連動)

### Canvas 操作

- 無限スクロール: cell 単位の grid、 BUFFER 領域でどこでも配置可能
- pan: 中ボタン drag / Space+左 drag / shift+wheel
- zoom: Ctrl+wheel / toolbar、 zoom 1% (MIN_ZOOM_FIT) - 250% (MAX_ZOOM)
- Ctrl+0 で 100% reset
- Ctrl+Shift+1 で fit-to-content (全 widget or 選択範囲)
- canvas 上 click で widget 選択解除

### 選択 (H-2 Tier B + C)

- single click = 1 widget 選択 (ring + handles 表示)
- shift+click = 複数選択 toggle
- **Ctrl+A** = active workspace の全 widget 選択
- **drag on empty canvas** = Box (rubber-band) 選択、 rect intersect で setMany
- Esc = 全解除
- Delete = 選択 widget 一括削除 (history 1 batch)

### Undo / Redo

- Ctrl+Z / Ctrl+Y で history 巻戻し / 進め
- add / remove / move / resize / config update の各 op を 1 entry
- per-workspace history、 workspace 切替で history clear (PR-D Codex must-fix #2)

### Context menu

- widget body 右クリック → 共通 context menu (`workspaceContextMenuStore`)
  - 「パスをコピー」「Explorer で開く」 (`path` 渡された時のみ)
  - 「アイテムを削除 (Library から)」 (`itemId` 渡された時のみ)
  - 「この widget から外す」 (per-widget hide、 `widget_item_hides` table)
  - 「Default app で開く」 (item.default_app + Opener cascade)
  - 「ウィジェット設定を開く」 (`onOpenSettings` callback)

### Wallpaper

- workspace 毎に画像 path + opacity + blur 設定
- `cmd_save_wallpaper_file` で APPDATA/wallpapers/<uuid>.<ext> に copy → DB 保存
- forward slash 正規化済 (asset:// protocol load 安定化)

---

## 配置可能 widget (14 種)

| widget           | category | 主機能                                                       | minViable |
| ---------------- | -------- | ------------------------------------------------------------ | --------- |
| Favorites        | library  | お気に入り item 一覧 (1 row stack、 多列 @container)         | 2×3       |
| Recent           | library  | 最近起動 item 一覧                                           | 2×3       |
| Projects         | watch    | 監視 folder の Git project 一覧 (list / card mode)           | 2×4       |
| Item             | library  | ピン留め item の grid                                        | 2×2       |
| Stats            | info     | 起動統計                                                     | 2×2       |
| QuickNote        | memo     | 自動保存メモ (font-content)                                  | 2×3       |
| ExeFolder        | watch    | folder watch 下の exe 一覧 (list / card mode + exe 候補切替) | 2×4       |
| DailyTask        | memo     | 日次チェックリスト                                           | 2×3       |
| Snippet          | memo     | テキスト snippet                                             | 2×3       |
| ClipboardHistory | tool     | clipboard 履歴                                               | 2×3       |
| FileSearch       | tool     | root folder 配下の filename 検索                             | 2×4       |
| SystemMonitor    | info     | CPU / Memory / Disk / Network の bar+sparkline               | 3×3       |
| ImageScrap       | memo     | 画像 widget (D&D 配置可)                                     | 2×2       |
| FilePreview      | memo     | text file preview (frontmatter / 内容、 font-content)        | 3×3       |

各 widget の詳細は `src/lib/widgets/<name>/index.ts` 参照。

---

## こうあってほしい (L0 抜粋)

- ページごとに widget 配置保存
- よく使うものを ワンクリック起動 (Favorites / Item widget)
- プロジェクト folder 一覧 + Git ブランチ状態 (Projects widget)
- 監視 folder の exe / script (.bat / .ps1 / .sh) 自動列挙 (ExeFolder)
- 画像 / text の D&D で widget 配置 (ImageScrap / FilePreview)
- メモ即書き保存 (QuickNote)
- DailyTask / SystemMonitor / Snippet
- workspace 名 system tag (sys-ws-\*) を widget 経由 register 時に自動付与
- widget 同士 重ならない (auto 空き探索 / 見つからなければ追加しない)
- 無限 canvas どこでも配置可、 fit-to-content で画面に収まる

---

## 関連 IPC

| command                                                                  | 用途                                  |
| ------------------------------------------------------------------------ | ------------------------------------- |
| `cmd_create_workspace` / `cmd_delete_workspace` / `cmd_update_workspace` | workspace CRUD                        |
| `cmd_list_workspaces`                                                    | tab bar render                        |
| `cmd_add_widget` / `cmd_remove_widget` / `cmd_list_widgets`              | widget CRUD                           |
| `cmd_update_widget_position` / `cmd_update_widget_config`                | widget edit                           |
| `cmd_save_wallpaper_file` / `cmd_set_workspace_wallpaper`                | wallpaper 設定                        |
| `cmd_save_image_scrap`                                                   | image widget の元 file copy           |
| `cmd_read_file_preview`                                                  | file-preview widget の meta + content |
| `cmd_add_watched_path` / `cmd_remove_watched_path`                       | folder watch 連動                     |
| `cmd_add_widget_item_hide` / `cmd_remove_widget_item_hide`               | per-widget hide                       |

---

## 制約 / Non-goals

- multi-monitor 配置なし (1 main window 内のみ)
- widget 同士の overlap 禁止 (重ねて配置できない)
- widget 配置の inter-workspace 移動なし (削除 + 別 workspace に再配置)
- 1 widget の cross-workspace 共有なし (各 workspace 独立 config)
