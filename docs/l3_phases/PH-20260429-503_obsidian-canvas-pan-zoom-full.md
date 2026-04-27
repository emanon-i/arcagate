---
id: PH-20260429-503
title: Workspace = Obsidian Canvas (常時編集 / 即時保存 / pan / zoom / transform: scale / Fit / ミニマップ)
status: todo
batch: 109
era: per-widget-polish
priority: critical
parent_l1: REQ-006_workspace-widgets
scope_files:
  - src/lib/components/arcagate/workspace/WorkspaceLayout.svelte
  - src/lib/components/arcagate/workspace/WorkspaceCanvas.svelte (新規 or 抽出)
  - src/lib/components/arcagate/workspace/WorkspaceMinimap.svelte (新規)
  - src/lib/components/arcagate/workspace/WorkspaceToolbar.svelte (新規、Undo/Redo/1:1/Fit)
  - src/lib/state/workspace-canvas.svelte.ts (新規、pan/zoom 状態管理 + 永続化)
  - src/lib/state/workspace.svelte.ts (即時保存への切替、編集モード撤廃)
  - src/lib/state/workspace-history.svelte.ts (Undo/Redo 既存活用、強化検討)
  - src/lib/components/arcagate/workspace/WidgetHandles.svelte (常時表示)
---

# PH-503: Workspace = Obsidian Canvas (本筋・最優先)

## 背景

ユーザー dev fb (2026-04-28、検収項目 #27 + 大幅簡素化宣言):

> ウィジットの磨き込みやWorkspaceの使い心地の磨き込みをしてね。
> 正直Obsidian Canvasのほぼコピーでいいと思う。そう考えると保存やキャンセルなどの複雑な処理はなくなり、アンドゥリドゥと拡大率のリセットと置いてるウィジットに画面を合わせるとかだけでいいのかもね

> ウィジット編集モードちゃんとObsidianのキャンバスをまねてくれ
> pan（マウススクロール上下、Shift+wheel 左右、middle button drag）
> zoom（Ctrl+wheel）
> transform: scale uniform 拡縮
> ミニマップ（候補）
> グリッドスナップ
> フリーレイアウト

batch-108 PH-494 MVP は **dotted grid + padding 縮小のみ**。本 plan で **本格刷新**。

## 前提条件 (research-first)

⚠️ **PH-503a (Obsidian Canvas 仕様調査) の完了が本 plan 着手の前提**。

ユーザー指示 (2026-04-28):

> Obsidian Canvasの具体的な仕様についてはちゃんと調べてから真似するようにして
> （全部真似すると微妙になるかもだからそのまま真似する必要はないが操作感や挙動はかなり取り入れてほしい）

PH-503a で `docs/l1_requirements/design/obsidian-canvas-spec-survey.md` を作成、user OK
取得 → 本 plan の入力マッピング / 描画 / state 詳細を spec doc に基づいて確定 → 実装着手。

研究をスキップして実装に入るのは禁止。

## 設計大方針

### 撤廃するもの

1. **編集モード / 閲覧モード切替** ボタン → 常時編集可能 (Obsidian Canvas 同様)
2. **保存 / キャンセル / Apply / 確定** ボタン (Workspace 配置レベル) → 全部即時保存
3. **draft/committed 分離** (PH-478 既存) は widget 配置レベルでは廃止、**Settings dialog 内では維持**
4. **「編集モード切替ボタン」** (PH-496 で左上固定したやつ) → 不要、撤廃

### 残す / 強化するもの

1. **Undo / Redo** (PH-477 既存): Ctrl+Z / Ctrl+Shift+Z、Cancel 代替として重要度↑
2. **拡大率リセット** (新規): `Ctrl+0` で zoom = 1.0、`1:1` ボタン
3. **Fit to content** (新規): 配置済 widget の bounding box に zoom fit、`Shift+1` キーボードショートカット、`Fit` ボタン (PH-473 既存 Crop の延長)
4. **削除確認**: dialog 一発で確認 → 削除、Undo で戻せる
5. **WidgetHandles** は常時表示 (hover で出る、選択時も出る、編集モード判定なし)

## 受け入れ条件

### 入力マッピング (Obsidian Canvas 互換)

- [ ] **マウス wheel (上下)** → 縦 pan (Obsidian と同)
- [ ] **Shift + wheel** → 横 pan
- [ ] **Middle button drag** → 自由 pan (上下左右同時)
- [ ] **Ctrl + wheel** → zoom in/out (10% step、min 25% / max 400%、cursor 位置を中心)
- [ ] **Space + drag** (補助、Figma/Excalidraw 慣習) → 自由 pan (LMB drag)
- [ ] **キーボード**:
  - `Ctrl+Z` Undo
  - `Ctrl+Shift+Z` Redo
  - `Ctrl+0` zoom 100% reset
  - `Ctrl++` / `Ctrl+-` zoom step
  - `Shift+1` Fit to content
- [ ] **トラックパッド ピンチ zoom** (gesture event)

### 描画

- [ ] **transform: scale + translate** で uniform 拡縮 (CSS transform、widget は内部 size 保持)
- [ ] **dotted grid** が pan/zoom に追従 (background-position offset)
- [ ] **widget は grid snap** (オプション、Shift で外し可)
- [ ] **canvas 端 fade** (薄くフェード、無限感)
- [ ] **scrollbar 出ない** (overflow: hidden + transform で表現)

### 即時保存

- [ ] **widget 配置 / リサイズ / 移動 / 削除** → 即時 DB 保存 (debounce 200ms 程度、batch save)
- [ ] **保存 / キャンセル ボタン廃止** (Workspace 配置レベル)
- [ ] **「保存しますか?」dialog 廃止**
- [ ] **Settings dialog 内 (widget config 編集)** は draft/committed 分離維持 (PH-478)
- [ ] **削除確認 dialog** は維持 (誤操作防止) → 確認後即削除、Undo で戻せる

### Toolbar

- [ ] **WorkspaceToolbar.svelte** 新規 (左上 or 右下に固定):
  - Undo / Redo (アイコン + キーボードショートカット tooltip)
  - 1:1 (zoom 100% reset)
  - Fit (bounding box fit)
  - Minimap toggle
  - Workspace 設定 (壁紙等 → PH-499)

### ミニマップ

- [ ] **右下に固定** ミニマップ (200x150 位)、widget 配置をスケール表示
- [ ] **ミニマップクリック** → そこに pan
- [ ] **ミニマップ drag** → viewport 移動
- [ ] **toggle button** (キーボード `M`) で表示/非表示

### state

- [ ] **per-workspace で pan/zoom 永続化** (workspace table に pan_x/pan_y/zoom field 追加 or canvas_state JSON)
- [ ] **app 再起動でも pan/zoom keep**

### 性能

- [ ] **60fps 維持** (pan/zoom 中)、widget 30 個までで体感 lag なし
- [ ] **transform: translate3d で GPU 加速**

### a11y

- [ ] **Reduced Motion 時** = pan/zoom アニメ無効、即時反映
- [ ] **キーボードのみ** で zoom / pan 可能 (Ctrl+矢印で pan、Ctrl++ / Ctrl+- で zoom)

### 移行 (既存挙動の撤廃)

- [ ] **PH-496 編集モード切替ボタン** 撤廃 (左上固定 button 削除、常時編集なので不要)
- [ ] **編集モード boolean state** 撤廃 (workspace store 整理)
- [ ] **保存ボタン / キャンセルボタン** 撤廃 (Workspace 配置レベル)
- [ ] **PH-478 draft/committed** は widget config dialog 内のみで維持
- [ ] 既存 E2E spec で「編集モードに入る」操作を全 grep + 修正 (`getByLabel('編集モード').click()` 等)

### テスト

- [ ] E2E: pan → zoom → ミニマップ → reset の連携 spec
- [ ] E2E: widget 配置即時保存 (reload 後 keep) spec
- [ ] E2E: Undo で削除復活 spec
- [ ] E2E: Fit to content で全 widget 入る spec
- [ ] before/after スクショ + 動画 (gallery)

## 実装ステップ

1. WorkspaceCanvas.svelte 新規 (pan/zoom 専用、WorkspaceLayout から抽出)
2. workspace-canvas.svelte.ts state store (pan {x,y} / zoom number / minimap visible)
3. PointerEvent + WheelEvent handler (上記入力マッピング全網羅)
4. transform: scale + translate3d 適用
5. dotted grid offset 連動
6. 編集モード state 撤廃 (PH-496 button 削除、保存/キャンセル button 削除)
7. 即時保存に切替 (workspace.svelte.ts の draft/committed 廃止 → 即 DB)
8. WorkspaceToolbar.svelte 新規 (Undo/Redo/1:1/Fit/Minimap toggle)
9. WorkspaceMinimap.svelte 新規実装
10. per-workspace pan/zoom 永続化 (migration + workspace_repository)
11. キーボードショートカット (Ctrl+0 / Ctrl+- / Ctrl++ / Shift+1 / M / Ctrl+Z / Ctrl+Shift+Z)
12. Crop = bounding box fit (PH-473 既存 Crop と統合)
13. 既存 E2E spec の編集モード前提を全修正 (grep + sed パターン)
14. E2E 新 spec 追加 (上記 4 種)
15. パフォーマンス計測 (widget 30 個 + drag → 60fps assert)
16. before/after スクショ + 動画

## 規約参照

- ux_standards.md (Reduced Motion, keyboard nav)
- engineering-principles §6 SFDIPOT (Time: 60fps、Operations: pan/zoom 直感、Function: 即時保存)
- batch-108 PH-494 MVP の延長
- 参考: Obsidian Canvas / Excalidraw / Miro / Figma の入力マッピング

## 関連 plan

- **PH-477 Undo/Redo (既存 done)**: Cancel 代替として活用、必要なら強化
- **PH-478 状態管理整理 (既存 done)**: widget 配置レベルは即時保存に切替、Settings dialog 内では維持
- **PH-499 背景壁紙**: Workspace 設定の一部、Toolbar 経由で開く
- **PH-502 表示領域拡大**: 「常時編集 = 画面いっぱい」の思想で統合可能
- **PH-473 Crop (既存 done)**: Fit to content と統合

## 注意

これは batch-109 で **最優先・最大規模** plan。実装規模 2〜3 日想定。
他 plan より polish 担保のため**最初から本格実装** (MVP 段階なし)。

ユーザー曰く「**ウィジットがこのアプリの肝**」、Workspace 編集体験は core experience なのでとことん。
