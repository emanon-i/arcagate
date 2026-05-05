---
id: PH-20260426-377
status: done
batch: 84
type: 改善
era: Refactor Era / 簡素化フェーズ
---

# PH-377: 確認ダイアログ重複統合（共通 ConfirmDialog 化）

## 横展開チェック実施済か

- batch-82 refactoring-opportunities.md の重複箇所 #1
- 3 箇所 ~90 行の重複: WorkspaceLayout 編集破棄 / per-card override 解除 / アイテム削除

## 仕様

`src/lib/components/common/ConfirmDialog.svelte` 新規作成:

```typescript
interface Props {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant?: 'destructive' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}
```

3 箇所の重複ダイアログを ConfirmDialog に置換:

- WorkspaceLayout 編集破棄確認（cancelConfirmOpen）
- LibraryDetailPanel per-card override 解除確認（resetConfirmOpen）
- WorkspaceDeleteConfirmDialog (既存) を ConfirmDialog の wrapper に薄化

## 受け入れ条件

- [x] ConfirmDialog.svelte 作成（テスト含む / PH-378 で 9 ケース）
- [x] 3 箇所の重複削除（WorkspaceLayout cancelConfirmOpen + LibraryDetailPanel resetConfirm + WorkspaceDeleteConfirmDialog 薄化）
- [x] 既存 e2e 全 pass（PH-378 で別途確認）
- [x] `pnpm verify` 全通過（PH-379 で最終確認）
