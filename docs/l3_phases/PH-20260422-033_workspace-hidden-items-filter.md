---
status: todo
phase_id: PH-20260422-033
title: Workspace Widget で非表示アイテムをフィルタリング
depends_on: []
scope_files:
  - src/lib/components/arcagate/workspace/FavoritesWidget.svelte
  - src/lib/components/arcagate/workspace/RecentLaunchesWidget.svelte
parallel_safe: true
---

# PH-20260422-033: Workspace Widget での非表示アイテムフィルタリング

## 目的

Library では `hiddenStore.isHiddenVisible` の状態に基づき、非表示アイテム（`is_enabled = false`）を
表示/非表示切り替えできる。しかし Workspace の FavoritesWidget や RecentLaunchesWidget では
この切り替えが反映されず、Library で非表示設定したアイテムが Workspace には表示され続ける
不一致が生じている。

## 現状

```typescript
// FavoritesWidget.svelte: hiddenStore を参照していない
// RecentLaunchesWidget.svelte: 同様に非表示フィルタなし
```

## 設計判断

- `FavoritesWidget` と `RecentLaunchesWidget` で `hiddenStore` を import
- アイテムリストを render 時に `hiddenStore.isHiddenVisible ? items : items.filter(i => i.is_enabled)` でフィルタ
- `is_enabled` フィールドが Widget で参照するアイテム型に存在するか事前確認が必要
- ProjectsWidget は Workspace/ファイルシステムベースのため対象外

## 実装ステップ

### Step 1: 対象 Widget ファイルを読んで現在の実装を確認

FavoritesWidget.svelte と RecentLaunchesWidget.svelte を読む。
アイテム型に `is_enabled` があるか確認する。

### Step 2: hiddenStore import とフィルタ適用

```typescript
import { hiddenStore } from '$lib/state/hidden.svelte';

// items の導出
let visibleItems = $derived(
    hiddenStore.isHiddenVisible
        ? items
        : items.filter((i) => i.is_enabled),
);
```

### Step 3: pnpm verify

## コミット規約

`feat(PH-20260422-033): Workspace Widget で非表示アイテムをフィルタリング`

## 受け入れ条件

- [ ] `pnpm verify` 通過
- [ ] FavoritesWidget: 非表示切替ボタン OFF 時に is_enabled=false のアイテムが非表示になること
- [ ] RecentLaunchesWidget: 同様に非表示フィルタが機能すること

## 停止条件

- Widget が使用するアイテム型に `is_enabled` フィールドがない → 型を調査して報告
- RecentLaunchesWidget が存在しない → FavoritesWidget のみ実装して完了
