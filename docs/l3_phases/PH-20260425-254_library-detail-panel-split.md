---
id: PH-20260425-254
status: wip
batch: 60
type: 改善
---

# PH-254: LibraryDetailPanel タグ管理セクション抽出

## 背景・目的

`LibraryDetailPanel.svelte`（333行）はタグ管理 UI の状態管理ロジックが長く、
メンテナンス性が低い。タグ操作部分を `LibraryItemTagSection.svelte` に分離して
コンポーネントの責務を明確にする。

## 実装ステップ

### Step 1: `LibraryItemTagSection.svelte` 作成

`src/lib/components/arcagate/library/LibraryItemTagSection.svelte` を新規作成。

Props:

```typescript
interface Props {
    itemId: string;
    itemTags: Tag[];
    availableTags: TagWithCount[];
    onAddTag: (tagId: string) => Promise<void>;
    onRemoveTag: (tagId: string) => Promise<void>;
}
```

移動するコード:

- タグドロップダウン状態（`showTagSelect`, `tagDropdownEl`, `tagTriggerEl`, `focusedTagIndex`）
- `closeTagDropdown()` 関数
- `$effect` でのフォーカス制御
- タグ表示・追加・削除の HTML テンプレート全体

### Step 2: `LibraryDetailPanel.svelte` 修正

- `LibraryItemTagSection` を import
- タグ関連の状態・ロジックを削除（Props 経由で渡す）
- template の Tags section を `<LibraryItemTagSection>` 呼び出しに置換

### Step 3: pnpm verify

## 受け入れ条件

- [ ] `LibraryDetailPanel.svelte` が 290行以下になる
- [ ] `LibraryItemTagSection.svelte` が新規作成される
- [ ] `pnpm verify` 全通過
- [ ] E2E タグ操作テストが通過する
