---
id: PH-20260424-207
title: Library アイテム間区切り線追加（feedback #18）
status: done
priority: medium
parallel_safe: true
scope_files:
  - src/lib/components/arcagate/library/LibraryMainArea.svelte
depends_on: []
---

## 目的

ユーザフィードバック #18: 「アイテム/ワークスペースの間に罫線で分離」

LibraryMainArea のアイテムカード間に薄い区切り線を追加し、リスト構造の視認性を向上させる。

## 現状分析

LibraryMainArea.svelte の `{#each items ...}` レンダリングで各 LibraryCard を並べている。
カード間の視覚的分離が薄く、個々のアイテムが区別しにくい。

## 変更方針

- 各 LibraryCard の下に `<hr>` または CSS border-bottom で区切り線を追加
- `--ag-border` トークンを使用（既存トークンと整合）
- 最後のアイテムには区切り線を出さない（`:last-child` 等）
- リスト/グリッド両表示に対応

## 実装ステップ

### Step 1: LibraryMainArea.svelte に区切り線を追加

`{#each items as item}` ブロック内の LibraryCard に `divide-y` またはインライン border-bottom。

Tailwind の `divide-y` クラス: 親に `divide-y divide-[var(--ag-border)]` を付与すると子要素間に自動で区切り線が入る。

**グリッド表示時**: `divide-y` はグリッドに効かない（行方向しか仕切れない）。
**リスト表示時**: `divide-y` が使える。

対応: 表示モード（list/grid）で分岐:

- list モード: `divide-y divide-[var(--ag-border)]`
- grid モード: 各カードに `border-b border-[var(--ag-border)]` を追加

### Step 2: 動作確認

- Library > リスト表示: カード間に薄い区切り線が見える
- Library > グリッド表示: 各カード下に区切り線が見える（最後の行も含む）
- ダーク / ライトテーマ切替で区切り線色が追従する

## 受け入れ条件

- [ ] リスト表示でアイテム間に `--ag-border` 色の区切り線が表示される
- [ ] グリッド表示でも各カード下に区切り線が表示される
- [ ] 最後のアイテムに余分な区切り線が出ない（実装による）
- [ ] テーマ切替で区切り線色が追従する
- [ ] `pnpm verify` 全通過
