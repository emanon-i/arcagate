---
id: PH-20260429-527
title: ホーム画面リデザイン (ラジアル + 傾いたカード)
status: todo
batch: 111
era: design-overhaul
parent_l1: REQ-007_visual-language
scope_files:
  - src/lib/components/arcagate/workspace/WorkspaceLayout.svelte
  - src/lib/components/arcagate/library/LibraryMainArea.svelte
  - src/lib/components/industrial/RadialHub.svelte (new)
---

# PH-491: ホーム画面リデザイン (ラジアル + 傾いたカード)

## 背景

仕様: `industrial-yellow-spec.md` 画面別翻訳「メインメニュー」+ レイアウト・構図。

> 大きな円形レーダーを中心に、左右へ傾いた操作カードが配置される。黒い空間に白いカード群が浮き、
> 選択や主要導線だけが蛍光イエローで強調される。

Arcagate のホーム = Library 画面 + Workspace 画面の起点。Industrial Yellow theme 時は
**ラジアル円形ハブ + 傾いた paper card** で工業端末感を演出。**Industrial Yellow theme 限定**で、
Light/Dark theme では既存のシンプルレイアウトを維持。

## 受け入れ条件

### 機能

- [ ] **RadialHub component**: 大きな円形 SVG (直径 320-400px、薄黄ストローク + 中心マーカー)、AppShell 中央に配置
- [ ] **傾いた paper card**: ホーム画面の主要導線 (Library / Workspace / Settings ナビ) を PH-489 PaperPanel + transform rotate (-3deg〜+3deg) で配置
- [ ] **theme-conditional render**: Industrial Yellow theme 時のみ RadialHub + 傾き card 表示、他 theme は既存 layout
- [ ] **「直線グリッド禁止」**: 配置は absolute positioning + 円弧計算、grid なし
- [ ] **選択中ハイライト**: 選択 card は L-bracket (PH-488) + 黄ライン
- [ ] **ホーム画面 entry point**: Library と Workspace の遷移ハブとして機能、既存 nav-items 流用

### 横展開チェック

- [ ] LibraryMainArea / WorkspaceLayout は theme-aware (themeStore.activeMode が theme-industrial-yellow なら hub 表示)
- [ ] PH-472 widget editing handle と排他なし (workspace 編集中は通常 grid に戻る)
- [ ] palette window (PH-046) のレイアウトには影響なし

### SFDIPOT

- **F**unction: ホーム画面で hub から各画面遷移、選択中 card は L-bracket 強調
- **D**ata: nav-items.ts の主要導線リストを再利用
- **I**nterface: themeStore.activeMode を $derived で監視、theme 切替で即時 layout 切替
- **P**latform: SVG circle + transform rotate
- **O**perations: keyboard navigation (Tab で card 移動)、card click で遷移
- **T**ime: theme 切替で UI 即時切替、layout shift あり (許容範囲、別 theme で既存 layout)

### HICCUPPS

- [Image] 仕様「メインメニュー」描写を直訳
- [User] 「黒い空間に白いカード群が浮く」感覚
- [Consistency] CLAUDE.md「同じ機能には同じアイコン+ラベル」: hub card のラベルは nav-items.ts と同一

## 実装ステップ

1. `RadialHub.svelte`: SVG circle (黄 stroke、薄)、中央に小マーカー、絶対配置で AppShell 中央
2. card 配置: 円弧上の N 個 (Library / Workspace / Settings の 3 個から開始)、各 card は absolute + transform rotate
3. theme 条件 render: WorkspaceLayout の上位 AppShell or routes/+layout.svelte で `{#if themeStore.activeMode === 'theme-industrial-yellow' && currentRoute === '/'}` で RadialHub 表示
4. 既存 sidebar / nav は維持、hub は overlay でなく home 画面の主視覚要素
5. unit test (vitest) で render 検証

## 規約参照

- `industrial-yellow-spec.md` 画面別翻訳「メインメニュー」+ 禁忌 §5 (矩形グリッド NG)
- vision.md (ホーム画面の役割)
- PH-472 selection ring と Industrial Yellow L-bracket の theme 排他

## 参考

- 既存 nav-items.ts (主要導線データ)
- WorkspaceLayout.svelte (現状ホーム配置)
