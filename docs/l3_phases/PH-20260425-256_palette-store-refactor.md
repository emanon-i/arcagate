---
id: PH-20260425-256
status: todo
batch: 60
type: 改善
---

# PH-256: paletteStore IPC 依存整理

## 背景・目的

`palette.svelte.ts` は `ipc/items`, `ipc/launch`, `ipc/workspace` の3モジュールを
直接 import して `itemStore`, `toastStore` にも依存している（component-graph.md B-2）。
検索・起動・頻度取得の責務を明確に分割し、IPC 呼び出しを整理する。

## 現状の依存

```
paletteStore
  ├── ipc/items    (searchItemsInTag)
  ├── ipc/launch   (searchItems, launchItem)
  ├── ipc/workspace (getFrequentItems, getRecentItems)
  ├── itemStore    (tagWithCounts)
  └── toastStore   (error 表示)
```

## 実装ステップ

### Step 1: 依存マップ確認

`src/lib/state/palette.svelte.ts` の全 import と使用箇所を確認し、
各 IPC 関数の呼び出し回数・コンテキストをリストアップ。

### Step 2: IPC 呼び出し集約

`searchItems`（launch IPC）と `searchItemsInTag`（items IPC）は同一の
「クエリ実行」処理。`performSearch()` 内部関数に統合し、IPC 呼び出しを
1 関数にまとめる。

### Step 3: toastStore 依存を明示化

現状 `toastStore.add` が直接呼ばれているが、エラーは呼び出し元コンポーネントで
処理すべきかを検討。`lastError` state を公開して呼び出し元に委ねる方式に変更。

### Step 4: pnpm verify + vitest

## 受け入れ条件

- [ ] `palette.svelte.ts` の import 行数が削減される
- [ ] `performSearch()` が単一の検索関数になる
- [ ] vitest が全通過
- [ ] `pnpm verify` 全通過
- [ ] Palette の検索・起動が動作する
