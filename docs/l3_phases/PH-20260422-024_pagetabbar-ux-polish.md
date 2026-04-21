---
status: todo
phase_id: PH-20260422-024
title: PageTabBar UX 磨き（日本語化 + blur ガード）
depends_on: []
scope_files:
  - src/lib/components/arcagate/workspace/PageTabBar.svelte
parallel_safe: true
---

# PH-20260422-024: PageTabBar UX 磨き（日本語化 + blur ガード）

## 目的

`PageTabBar` の "+ Add page" ボタンが英語表記のままになっており、UI 全体の日本語統一方針と
不一致。また `onblur={commitAdd}` のみで Escape キャンセル後の blur を防いでいないため、
Escape → フォーカス移動の順でキャンセル後に空名ワークスペースが誤作成されるリスクがある。

## 現状

```svelte
<!-- PageTabBar.svelte -->
<button ... onclick={startAdd}>
    + Add page          <!-- 英語表記 -->
</button>

<!-- 入力中 -->
<input
    onblur={commitAdd}  <!-- blur ガードなし: isAdding=false でも commitAdd が走る -->
    ...
/>
```

## 設計判断

- "+ Add page" → "+ ページを追加"（日本語統一）
- `commitAdd` に `if (!isAdding) return;` ガードを追加（stale blur 防止）
- `onblur` は `commitAdd` のまま維持（Tab/外部クリックで確定する UX は有用）

## 実装ステップ

### Step 1: テキスト日本語化

```svelte
<button ... onclick={startAdd}>
    + ページを追加
</button>
```

### Step 2: blur ガード追加

```typescript
function commitAdd() {
    if (!isAdding) return; // stale blur ガード
    const name = newName.trim();
    if (name) {
        void workspaceStore.createWorkspace(name);
    }
    isAdding = false;
    newName = '';
}
```

### Step 3: pnpm verify

## コミット規約

`feat(PH-20260422-024): PageTabBar 日本語化 + commitAdd blur ガード`

## 受け入れ条件

- [ ] `pnpm verify` 通過
- [ ] "+ ページを追加" と表示されること
- [ ] Escape キーでキャンセル後、フォーカス移動してもワークスペースが作成されないこと
- [ ] Tab キー / 外部クリックで確定（commitAdd）が動作すること
