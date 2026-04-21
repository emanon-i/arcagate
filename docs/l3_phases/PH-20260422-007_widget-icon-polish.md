---
status: todo
phase_id: PH-20260422-007
title: Workspace ウィジェット内アイコン表示ポリッシュ
depends_on:
  - PH-20260422-001
scope_files:
  - src/lib/components/arcagate/workspace/FavoritesWidget.svelte
  - src/lib/components/arcagate/workspace/RecentLaunchesWidget.svelte
  - src/lib/components/arcagate/common/ItemIcon.svelte
parallel_safe: true
---

# PH-20260422-007: Workspace ウィジェット内アイコン表示ポリッシュ

## 目的

FavoritesWidget / RecentLaunchesWidget はアイテムをテキストリストで表示しているが、
`item.icon_path` が存在するにもかかわらずウィジェット内では活用されていない。
アイコンを追加することで視覚的識別性を高め、「ゲーム用ウィジェットを開いてボタン一発」
という Workspace の使用シナリオが直感的になる。

## 参照ドキュメント

- `docs/desktop_ui_ux_agent_rules.md` §2 視認性、§4 視覚的一貫性
- `docs/lessons.md`
- Workspace ビジョン: 編集しやすさ・追加の素早さ・毎日使えるシナリオ

## 実装ステップ

### Step 1: 現状確認

1. `pnpm tauri dev` で起動
2. FavoritesWidget / RecentLaunchesWidget の現状をスクショ
3. アイコンあり・なしアイテムが混在する状態で表示確認

### Step 2: FavoritesWidget にアイコンを追加

`FavoritesWidget.svelte` のアイテム行に `ItemIcon` コンポーネントを追加:

```svelte
<ItemIcon iconPath={item.icon_path} alt="{item.label} icon" class="h-5 w-5 shrink-0" />
```

- アイコンがない場合は汎用フォールバックアイコン（`@lucide/svelte` の `AppWindow` 等）を表示
- レイアウト: アイコン（20px）+ ラベル（truncate）のフレックス行

### Step 3: RecentLaunchesWidget にアイコンを追加

同様に `RecentLaunchesWidget.svelte` のアイテム行に追加。
color dot（起動時間インジケーター）はアイコン右下のバッジとして重ねるか、削除して整理するかを
実機確認で判断。

### Step 4: ItemIcon のフォールバック実装

`ItemIcon.svelte` に `iconSrc` が null/undefined の場合のフォールバックを追加:

```svelte
{:else}
  <AppWindow class="h-full w-full text-[var(--ag-text-muted)]" />
{/if}
```

### Step 5: 実機確認

1. アイコンあり・なしアイテムが混在した状態で見た目を確認
2. ダークモード・ライトモードそれぞれで確認
3. アイコンサイズがウィジェット行高さと調和しているか確認

## コミット規約

`feat(PH-20260422-007): ウィジェット内アイコン表示追加（Favorites / Recent / ItemIcon フォールバック）`

## 受け入れ条件

- [ ] FavoritesWidget のアイテム行にアイコンが表示される
- [ ] RecentLaunchesWidget のアイテム行にアイコンが表示される
- [ ] icon_path がない場合にフォールバックアイコンが表示される（空白なし）
- [ ] ダークモード・ライトモードで視認性が確保されている
- [ ] `pnpm verify` 通過
- [ ] スクショを `tmp/screenshots/PH-20260422-007/` に保存（before/after）

## Exit Criteria

受け入れ条件 6 つがすべて [x]

## 停止条件

- アイコンのアスペクト比やトリミングに関して `ItemIcon.svelte` の大規模リファクタが必要 → 停止して報告
- ウィジェット行高さの変更が他ウィジェットに広範な影響を与える → 停止して報告
