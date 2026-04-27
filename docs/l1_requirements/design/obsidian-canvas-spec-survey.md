---
title: Obsidian Canvas 仕様調査 + 取捨選択 (PH-503a)
status: draft
date: 2026-04-28
sources:
  - https://help.obsidian.md/Plugins/Canvas (公式 doc、SPA で WebFetch から本文取得不可)
  - https://obsidian.md/canvas (公式紹介、操作説明含む)
  - https://www.techtooler.com/complete-tutorial-to-canvas-in-obsidian/ (3rd party tutorial、操作詳細あり)
  - https://forum.obsidian.md/t/canvas-alternative-more-fluid-hotkeys/50546 (forum、現状仕様への提案)
  - https://jsoncanvas.org/spec/1.0/ (file format 公式 spec)
  - https://github.com/obsidianmd/jsoncanvas (file format リファレンス)
---

# Obsidian Canvas 仕様調査 + 取捨選択

## 目的

PH-503 (Workspace = Obsidian Canvas) 実装前の仕様調査。
ユーザー指示「Obsidian Canvas の具体的な仕様についてはちゃんと調べてから真似する」に基づき、
**research → spec doc → 実装** の順序で進める。

## 1. Pan (画面移動)

| 入力                             | Obsidian 挙動       | 出典                    | Arcagate 採用 | 備考                                                     |
| -------------------------------- | ------------------- | ----------------------- | ------------- | -------------------------------------------------------- |
| Mouse wheel (上下)               | 縦 pan              | techtooler / 公式 forum | ✅ 採用       | デフォルト navigation                                    |
| Shift + wheel                    | 横 pan              | techtooler / 公式 forum | ✅ 採用       | 横スクロール                                             |
| Space + LMB drag                 | 自由 pan (上下左右) | techtooler              | ✅ 採用       | Figma 慣習と整合                                         |
| Right-click drag                 | 自由 pan            | techtooler              | 🟡 検討       | Arcagate は右クリック menu と衝突するため別 mapping 検討 |
| Middle button (wheel click) drag | 自由 pan            | techtooler              | ✅ 採用       | 標準的                                                   |
| トラックパッド 2 本指 swipe      | pan (推測)          | 不明 (要 user 確認)     | ✅ 採用予定   | ブラウザ標準 wheel event 経由                            |

## 2. Zoom (拡大縮小)

| 入力                 | Obsidian 挙動           | 出典                        | Arcagate 採用     | 備考                                                 |
| -------------------- | ----------------------- | --------------------------- | ----------------- | ---------------------------------------------------- |
| Ctrl/Cmd + wheel     | zoom in/out             | techtooler / 公式 doc title | ✅ 採用           | 標準                                                 |
| Space + wheel        | zoom in/out (代替)      | techtooler                  | 🟡 検討           | Space + LMB drag (pan) と同じ modifier、衝突回避必要 |
| トラックパッドピンチ | zoom (推測)             | 不明 (要 user 確認)         | ✅ 採用予定       | gesture event                                        |
| 上限                 | **不明 (要 user 確認)** | 公式記載なし                | 400% 採用予定     | Figma / Excalidraw 慣習                              |
| 下限                 | **不明 (要 user 確認)** | 公式記載なし                | 25% 採用予定      | 同上                                                 |
| step                 | **不明 (要 user 確認)** | 公式記載なし                | 10% step 採用予定 | 同上                                                 |
| zoom 中心            | カーソル位置 (推測)     | 公式記載なし                | ✅ カーソル位置   | 業界標準                                             |

## 3. Fit / Reset

| 入力                    | Obsidian 挙動           | 出典                   | Arcagate 採用     | 備考                |
| ----------------------- | ----------------------- | ---------------------- | ----------------- | ------------------- |
| **Shift + 1**           | Zoom to fit (全 widget) | techtooler / WebSearch | ✅ 採用           | 同 shortcut         |
| **Shift + 2**           | Zoom to selection       | techtooler / WebSearch | 🟡 検討           | multi-select 実装後 |
| **拡大率 100% reset**   | **不明 (要 user 確認)** | 公式記載なし           | `Ctrl+0` 採用予定 | VS Code/Figma 慣習  |
| Pan / zoom reset (両方) | **不明 (要 user 確認)** | 公式記載なし           | 採用しない        | Undo で代替可能     |

## 4. Undo / Redo

| 入力             | Obsidian 挙動          | 出典                              | Arcagate 採用    | 備考                       |
| ---------------- | ---------------------- | --------------------------------- | ---------------- | -------------------------- |
| **Ctrl+Z**       | Undo                   | techtooler                        | ✅ 採用 (PH-477) | 既存                       |
| **Ctrl+Y**       | Redo (techtooler 記載) | techtooler                        | ✅ 採用          | 既存                       |
| **Ctrl+Shift+Z** | Redo (一般慣習)        | 不明 (要 user 確認、両方対応推奨) | ✅ 採用 (PH-477) | 既存、両 shortcut 対応推奨 |

## 5. Selection

| 入力          | Obsidian 挙動           | 出典                | Arcagate 採用 | 備考        |
| ------------- | ----------------------- | ------------------- | ------------- | ----------- |
| Click         | single select           | techtooler          | ✅ 採用       | 標準        |
| Shift + Click | multi-select 追加       | techtooler          | ✅ 採用       | 標準        |
| Ctrl + Click  | **不明 (要 user 確認)** | 不明                | 🟡 採用予定   | toggle 選択 |
| Drag (空白)   | box select              | techtooler          | ✅ 採用予定   |             |
| Ctrl + A      | select all              | techtooler          | ✅ 採用       |             |
| Esc           | 選択解除 (推測)         | 不明 (要 user 確認) | ✅ 採用       | 標準        |

## 6. Card 編集

| 入力                      | Obsidian 挙動            | 出典         | Arcagate 採用             | 備考                           |
| ------------------------- | ------------------------ | ------------ | ------------------------- | ------------------------------ |
| Click-hold + drag         | move                     | techtooler   | ✅ 採用                   | 即時保存                       |
| **Shift + drag**          | constrain to single axis | techtooler   | ✅ 採用予定               | axis-locked 移動               |
| **Ctrl + drag**           | clone (copy 配置)        | techtooler   | 🟡 検討                   | widget 複製、後続検討          |
| Corner / edge drag        | resize handle            | techtooler   | ✅ 採用 (既存)            | PH-472 既存                    |
| **Delete / Backspace**    | delete                   | techtooler   | ✅ 採用                   | 確認 dialog 経由               |
| **矢印キー (細かい移動)** | **不明 (要 user 確認)**  | 公式記載なし | 1px / Shift+10px 採用予定 | Figma / Excalidraw 慣習        |
| **Copy / Paste**          | **不明 (要 user 確認)**  | 公式記載なし | 採用しない (一旦)         | widget 複製は Ctrl+drag で代替 |

## 7. Grouping / Alignment

| 機能                         | Obsidian 挙動                                          | 出典       | Arcagate 採用  | 備考                                   |
| ---------------------------- | ------------------------------------------------------ | ---------- | -------------- | -------------------------------------- |
| **グルーピング (同色枠)**    | 複数選択 → group icon (popup menu) で group ノード作成 | techtooler | 🟡 検討 (後続) | widget 整理に有用、PH-503 内 scope 外  |
| **alignment / distribution** | group 選択 → alignment icon                            | techtooler | 🟡 検討 (後続) | 複数選択で widget 整列、後続 plan 検討 |

## 8. 接続線 (Edges)

| 機能       | Obsidian 挙動            | 出典            | Arcagate 採用 | 備考                                  |
| ---------- | ------------------------ | --------------- | ------------- | ------------------------------------- |
| 接続線描画 | card 端から drag で line | techtooler      | ❌ **不採用** | Arcagate は launcher、widget 接続不要 |
| 接続線編集 | line label / color       | jsoncanvas spec | ❌ 不採用     | 同上                                  |

## 9. Card Type

| Card type  | Obsidian 挙動        | 出典            | Arcagate 採用  | 備考                            |
| ---------- | -------------------- | --------------- | -------------- | ------------------------------- |
| Text node  | markdown 記述可能    | jsoncanvas spec | ❌ 不採用      | widget は Arcagate 既存システム |
| File node  | vault 内ファイル参照 | jsoncanvas spec | ❌ 不採用      | 同上                            |
| Link node  | URL 表示             | jsoncanvas spec | ❌ 不採用      | 同上                            |
| Group node | 視覚的グルーピング   | jsoncanvas spec | 🟡 検討 (後続) | (7. グルーピング参照)           |

## 10. Drag & Drop

| 入力          | Obsidian 挙動  | 出典       | Arcagate 採用 | 備考                                                       |
| ------------- | -------------- | ---------- | ------------- | ---------------------------------------------------------- |
| ファイル drop | file card 配置 | techtooler | ❌ 不採用     | Arcagate は widget 配置中心、既存 LibraryItemPicker で対応 |

## 11. Right-click Context Menu

| 項目                   | Obsidian 挙動                   | 出典          | Arcagate 採用             | 備考                                        |
| ---------------------- | ------------------------------- | ------------- | ------------------------- | ------------------------------------------- |
| "Add note from vault"  | 既存 note 配置                  | search result | ❌ 不採用                 | widget concept 異なる                       |
| "Add media from vault" | 既存 media 配置                 | search result | ❌ 不採用                 | 同上                                        |
| Card 上 context menu   | **詳細項目不明 (要 user 確認)** | 不明          | ✅ 採用予定 (Arcagate 用) | widget 用 menu (削除/複製/設定/opener など) |

## 12. View / Style

| 機能           | Obsidian 挙動           | 出典                           | Arcagate 採用               | 備考                                   |
| -------------- | ----------------------- | ------------------------------ | --------------------------- | -------------------------------------- |
| dotted grid    | 表示あり                | 公式画像 (確認可)              | ✅ 採用 (PH-494 既存)       | size/色は **要 user 確認 or 推測実装** |
| ミニマップ     | **無い (推測)**         | 公式記載なし、forum で要望多数 | ✅ 採用予定 (Arcagate 独自) | PH-503 で実装、option toggle           |
| canvas 端 fade | **不明 (要 user 確認)** | 公式記載なし                   | ✅ 採用予定                 | 無限感                                 |

## 13. File Format / Save

| 機能                 | Obsidian 挙動            | 出典           | Arcagate 採用      | 備考                                         |
| -------------------- | ------------------------ | -------------- | ------------------ | -------------------------------------------- |
| `.canvas` JSON file  | JSON Canvas v1.0         | jsoncanvas.org | ❌ 不採用          | Arcagate は SQLite で workspace state 永続化 |
| auto save            | **明記なし (推測 auto)** | 不明           | ✅ 採用 (即時保存) | PH-503 大方針、debounce 200ms                |
| 明示的 save / cancel | **不明 (推測なし)**      | 不明           | ❌ 不採用          | 即時保存方針 (PH-503)                        |

## 14. JSON Canvas Node 構造 (参考)

公式 spec (`jsoncanvas.org/spec/1.0/`):

```json
{
  "id": "string (unique)",
  "type": "text | file | link | group",
  "x": "integer (pixels)",
  "y": "integer (pixels)",
  "width": "integer (pixels)",
  "height": "integer (pixels)",
  "color": "string (optional)"
}
```

Edge 構造:

```json
{
  "id": "string (unique)",
  "fromNode": "node id",
  "fromSide": "top|right|bottom|left (optional)",
  "toNode": "node id",
  "toSide": "top|right|bottom|left (optional)",
  "color": "string (optional)",
  "label": "string (optional)"
}
```

座標系: `in pixels` 明記、原点位置は **不明 (推測 left-top)**。

## 15. PH-503 への適用方針

### ✅ 採用 (確定)

- pan: wheel (上下) / Shift+wheel (左右) / Middle button drag / Space+LMB drag
- zoom: Ctrl+wheel
- Fit to content: Shift+1
- Undo/Redo: Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z (3 種対応)
- Selection: Click / Shift+Click / Drag box / Ctrl+A
- Move: drag / Shift+drag (axis-lock)
- Resize: corner/edge drag (PH-472 既存)
- Delete: Delete/Backspace + 確認 dialog
- 即時保存 (debounce 200ms)
- dotted grid (PH-494 既存)
- ミニマップ (Arcagate 独自、option toggle)

### 🟡 検討 (後続 plan、PH-503 scope 外)

- Right-click drag pan (右クリック menu と衝突回避必要)
- Space+wheel zoom (Space+LMB drag と modifier 衝突)
- Ctrl+Click multi-select toggle
- Ctrl+drag clone (widget 複製)
- グルーピング (group node、PH-503 後続 plan)
- alignment / distribution (複数選択整列)
- Shift+2 Zoom to selection (multi-select 実装後)
- 矢印キー細かい移動 (1px / Shift+10px、業界慣習採用)
- Copy / Paste (widget 複製、Ctrl+drag で代替可)

### ❌ 不採用 (Arcagate scope 外)

- 接続線 (edges) - Arcagate は launcher、widget 接続不要
- text node / file node / link node - widget 概念で代替
- `.canvas` JSON file format - SQLite で workspace state 管理
- ファイル drop card - LibraryItemPicker で対応
- Add note / media from vault context menu - vault 概念なし

### ❓ 不明 (user 確認 or 推測実装)

| 項目                      | 推測値                             | 確認方法                                           |
| ------------------------- | ---------------------------------- | -------------------------------------------------- |
| zoom 上限 / 下限 / step   | 25% / 400% / 10% step (Figma 慣習) | user の Obsidian 実機で確認                        |
| Ctrl + Click multi-select | toggle 選択                        | user の Obsidian 実機                              |
| 矢印キー移動 px           | 1px / Shift で 10px (Figma 慣習)   | user の Obsidian 実機                              |
| Copy / Paste shortcut     | Ctrl+C / Ctrl+V (一般慣習)         | user の Obsidian 実機                              |
| Card context menu 項目    | 詳細不明                           | user の Obsidian 実機                              |
| Esc キー挙動              | 選択解除 / edit 終了               | user の Obsidian 実機                              |
| dotted grid size / color  | 不明 (推測 16-20px、半透明 muted)  | スクショ計測 or user 確認                          |
| canvas 端 fade            | 不明                               | スクショ確認                                       |
| トラックパッドピンチ zoom | gesture event 標準対応 (推測)      | user 実機 (macOS 不要、Windows トラックパッド対応) |
| auto save 仕様            | debounce ?ms (推測 100-300ms)      | user 実機 / Obsidian source                        |

## 16. 不明点 → user 確認依頼

agent は dev session で Obsidian を直接実機検証できないため、上記 `❓ 不明` 項目は user の確認に委ねる。
**推測実装は禁止 (ユーザー指示)** のため、`要 user 確認` 項目は実装着手前に user に投げて回答を得てから決定。

特に:

1. **zoom 上限/下限/step** - 25% / 400% / 10% step で OK か？
2. **Card context menu 項目** - Arcagate 用 menu の参考にしたい (削除/複製/設定/opener 等が並ぶ想定)
3. **矢印キー細かい移動** - 1px / Shift+10px で OK か？
4. **Esc キー挙動** - 選択解除でいいか？

## 17. PH-503 実装の前提条件

本 doc に **user OK** が出るまで PH-503 実装着手しない。
user OK 後、本 doc の「✅ 採用」「🟡 検討 (後続)」を反映した PH-503 plan で実装する。

🟡 検討項目は **PH-503 後の個別 plan** として PH-506-513 polish phase 後に追加検討。

## 規約参照

- engineering-principles §6 SFDIPOT (Operations: pan/zoom/select 直感)
- engineering-principles §8 G9 テスト観点
- ux_standards.md (Reduced Motion, keyboard nav)
- desktop_ui_ux_agent_rules.md (Figma / VS Code / Obsidian 慣習踏襲)

## 出典まとめ

- **公式紹介**: `https://obsidian.md/canvas`
- **公式 doc** (SPA、本文取得不可): `https://help.obsidian.md/Plugins/Canvas`
- **techtooler tutorial** (実機操作詳細): `https://www.techtooler.com/complete-tutorial-to-canvas-in-obsidian/`
- **公式 forum** (要望投稿、現状仕様の暗示): `https://forum.obsidian.md/t/canvas-alternative-more-fluid-hotkeys/50546`
- **JSON Canvas spec v1.0** (file format): `https://jsoncanvas.org/spec/1.0/`
- **JSON Canvas GitHub**: `https://github.com/obsidianmd/jsoncanvas`
