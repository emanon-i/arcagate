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

## D&D 配置契約 (PH-CF-200)

workspace へのドロップ (OS ファイル / item / widget いずれも) は **ドロップ座標を grid セルへ
変換した位置に配置** する。 既存 widget の有無・個数は配置位置を変えない (アイテム 0 個でも
左上 (0,0) に固定しない)。 ドロップ座標が取得できない経路は配置に使ってはならず、 座標を持つ
経路へ寄せる。 座標が真に不明な場合のフォールバックは viewport 中心であり、 **(0,0) ではない**。

### 配置 seed の優先順位

`resolveSeedCell` (`src/lib/utils/widget-grid.ts`) で 1 関数に集約:

1. `dropCell` — OS file drop / pointer drop の cursor 位置 cell
2. `nearCell` — caller が明示的に渡した seed (sidebar keyboard add 等)
3. クラスタ中心 — 既存 widget 群の BB 中心 (`computeClusterAnchor`)
4. `viewportCenterCell` — viewport 中央 fallback

caller が `viewportCenterCell` を渡せば、 全 hint が無いケースでも viewport 中央 seed が
返り、 (0,0) 起点線形 scan には落ちない。 「(0,0) を結果的に避けるのはたまたま」 という
状態を排除する。

### 非同期ドロップ中のタブ切替 (page pin)

`tauri://drag-enter` 受信時に active workspace id を `workspaceDropCoords.pin()` で snapshot。
`addImageScrapWidget` / `addFilePreviewWidget` は backend `cmd_save_image_scrap` 等を await する
途中で user がタブを切り替えても、 widget は **pin した workspace** に配置する。 切替後の
workspace には誤配置しない。 pin は `tauri://drag-drop` または `tauri://drag-leave` で clear。

### 機械検出

- unit test: `src/lib/utils/widget-grid.test.ts` の `resolveSeedCell` (空 rects + dropCell で
  dropCell 採用 / 全 hint 無しなら null = (0,0) 非フォールバック)
- unit test: `src/lib/utils/drop-coords.test.ts` (zoom 変化で cell stride 追従 / scroll 追従 /
  DPR 除算 / 範囲外 null)
- e2e: `tests/e2e/workspace-dnd-placement.spec.ts` (WD-1 アイテム 0 個 / WD-2 既存有 / WD-3 scroll
  補正 / WD-4 page pin)

### 配置経路の集約 (簡素化)

PH-CF-200 で widget 配置経路を以下に集約:

| 関数                            | 用途                                                  | seed 解決                                                                            |
| ------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `addWidget(type, opts)`         | OS file drop / sidebar add 等                         | `resolveSeedCell({dropCell, nearCell, viewportCenterCell})` → `findFreePositionNear` |
| `addWidgetAt(type, x, y)`       | pointer drag の厳密配置 (overlap reject)              | (x, y) 直接、 失敗時 reject + toast (spiral fallback なし)                           |
| `bulkAddItemWidgets(ids, opts)` | Library → workspace 複数 item 送信 (現状 caller なし) | `resolveSeedCell` で各 item に seed → `findFreePositionNear`                         |

旧実装は `addWidget` が `nearCell ?? computeClusterAnchor` の 2 step、 `bulkAddItemWidgets` が
`findFreePosition` (0,0 起点) 直呼び、 `addWidgetAt` が直接配置と **4 経路に重複ロジック**が
分散していた。 PH-CF-200 で seed 解決を `resolveSeedCell` 1 関数に集約し、 (0,0) フォールバック
禁止と viewport 中央 fallback を経路横断で保証する。

## 破壊的操作の確認契約 (PH-CF-300)

workspace / タブ / widget の削除など取り返しのつかない操作は、 **専用 confirm modal** または
**undo-toast** のいずれかを必ず経由する。 `window.confirm` / `window.alert` / `window.prompt`
は使わない (チェックボックス等の拡張不能・OS 依存の見た目・ag-glass theme と不整合)。
削除確認モーダルは影響範囲 (削除される widget 数 / item 連鎖削除の有無) を文言で明示する。

### タブ (page) 削除 (E3 / E6)

`PageTabBar.svelte` の × button (ヒットエリア 28px square で widget チップとの被りを回避) と
右クリック「削除」 から `WorkspaceDeleteConfirmDialog` を開く。 modal は
`ConfirmDialog` (`destructive` variant) を内包し、 以下を必ず提示する:

- 削除対象 page 名 (title)
- 削除対象 widget 数 (extraNote、 IPC `cmd_list_widgets` で取得)
- 「このページの item も Library から削除」 チェックボックス (default = OFF、 破壊的なので
  opt-in)。 default OFF は「item は残す = 安全側」 の規律。

確定時、 `cmd_delete_workspace(id, delete_items)` を呼ぶ。 `delete_items` は PH-CF-100 で
必須引数化済 (implicit default なし)。

### widget 削除 (undo-toast)

複数選択時の Delete は確認なしで即削除し undo-toast を出す (`WorkspaceWidgetGrid.svelte`)。
影響範囲が局所的 (1 widget 復元は cheap) かつ undo 経路が確立しているため、 confirm modal
よりも undo-toast の方が編集 flow を妨げない。 **タブ削除と非対称な扱い** は意図:

- **タブ削除**: 影響大 (page 全体 + 紐付く item) → confirm modal + チェックボックス
- **widget 削除**: 影響小 (1 widget 単位) → undo-toast (即削除 + 5 秒以内 undo)

### 機械検出

- `scripts/audit-window-confirm.sh` が `src/**/*.{ts,svelte}` に対し
  `window.confirm|window.alert|window.prompt` 0 件を検証 (lefthook + `pnpm audit:all` で gate)。
- e2e: `tests/e2e/destructive-confirm.spec.ts` が
  (a) タブ × クリック → 専用 modal + チェックボックス表示
  (b) チェック OFF → item は Library に残る
  (c) チェック ON → 他 workspace 非参照 item は消える
  (d) `WorkspaceDeleteConfirmDialog.svelte` が実 import (dead-surface でない) されている DOM 検証
  を確認。
