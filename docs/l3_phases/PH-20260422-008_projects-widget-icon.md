---
status: todo
phase_id: PH-20260422-008
title: ProjectsWidget アイテムへのアイコン表示（007 残件）
depends_on:
  - PH-20260422-001
scope_files:
  - src/lib/components/arcagate/workspace/ProjectsWidget.svelte
parallel_safe: true
---

# PH-20260422-008: ProjectsWidget アイコン表示

## 目的

PH-20260422-007 では FavoritesWidget / RecentLaunchesWidget にアイコンを追加したが、
ProjectsWidget は対象外だった。dispatch-log C に記録済みの通り、ProjectsWidget のアイテム行は
`item.icon_path` を活用せずフォルダアイコンのみを表示している。
007 と同様のパターンで `ItemIcon` を追加し、ウィジェット間の視覚的一貫性を確保する。

## 参照ドキュメント

- `docs/desktop_ui_ux_agent_rules.md` §2 視認性、§5 一貫性
- `docs/lessons.md`

## 実装ステップ

### Step 1: ProjectsWidget 現状確認

1. `ProjectsWidget.svelte` のアイテム行テンプレートを確認
2. `item.icon_path` が渡る Item 型か確認（`folder` タイプも icon_path を持つ）

### Step 2: アイコン追加

`ProjectsWidget.svelte` のアイテム行に `ItemIcon` を追加:

```svelte
<ItemIcon iconPath={item.icon_path} alt="{item.label} icon" class="h-5 w-5 shrink-0 object-cover" />
```

- FavoritesWidget と同じ `h-5 w-5 shrink-0` サイズ
- フォールバックは `ItemIcon` 内の `AppWindow`（007 で追加済み）

### Step 3: pnpm verify + 受け入れ確認

## コミット規約

`feat(PH-20260422-008): ProjectsWidget にアイコン表示追加`

## 受け入れ条件

- [ ] ProjectsWidget のアイテム行にアイコンが表示される
- [ ] icon_path がない場合にフォールバックアイコンが表示される（空白なし）
- [ ] Favorites / Recent と視覚的に統一感がある（h-5 w-5 同サイズ）
- [ ] `pnpm verify` 通過

## Exit Criteria

受け入れ条件 4 つがすべて [x]

## 停止条件

- ProjectsWidget のアイテム行構造が大幅に異なり ItemIcon 追加のみでは解決しない → 停止して報告
