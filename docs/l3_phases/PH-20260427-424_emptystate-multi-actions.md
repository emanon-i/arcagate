---
id: PH-20260427-424
status: todo
batch: 93
type: 整理
era: UX Audit Re-Validation Round 2
---

# PH-424: EmptyState actions slot 複数化 + dispatch-log 整理

## 問題

batch-92 PH-418 の `EmptyState` 拡張は単一 `action` のままで、Codex Q5 #4 で指摘:

- Library 空状態 = 「アイテムを追加」のみ
- 業界 (Steam / Playnite) は「サンプルライブラリ追加」「ヘルプを見る」等の複数導線がある
- batch-92 PH-418 plan に「actions slot 化」とあったが scope 縮小で先送り → batch-93 で消化

## 改修

### EmptyState コンポーネント拡張

`src/lib/components/common/EmptyState.svelte`:

```svelte
interface Action {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'outline'; // shadcn Button variant
  icon?: Component;
}

interface Props {
  // ...
  action?: Action;          // 後方互換 (単一)
  actions?: Action[];       // 複数 (新規)
}
```

- `actions` が指定されたら配列、なければ既存の `action` で 1 件
- 表示順: primary action 強調、secondary actions outline

### Library 空状態の複数 actions

`LibraryMainArea.svelte`:

```svelte
<EmptyState
  icon={Package}
  title="ライブラリが空です"
  description="..."
  actions={[
    { label: 'アイテムを追加', onClick: () => onAddItem?.(), variant: 'default' },
    { label: '取り込みフォルダ設定', onClick: () => openSettingsLibrary(), variant: 'outline' },
    { label: 'ヘルプを見る', onClick: () => helpStore.open(), variant: 'outline', icon: HelpCircle },
  ]}
/>
```

### Workspace 空状態の actions

`WorkspaceLayout.svelte` (該当 EmptyState 使用箇所):

- 「ウィジェットを追加」 (default)
- 「サンプルワークスペースを追加」 (outline)
- 「ヘルプを見る」 (outline)

### dispatch-log 整理

batch-93 完走時に dispatch-log に:

- batch-93 完走記録 (PH-420〜424)
- batch-92 Codex Q5 指摘 8 件のうち batch-93 で解消した分 (#1, #2, #4, #5, #6, #7, #8) と残作業 (#3 OnboardingTour)
- batch-94 候補

### use-case-friction-v2 update

PH-415 の表で:

- ケース 5 (フォルダ整理): H1 / H9 を severity 3 → 1 に再評価 (PH-421 で解消)
- ケース 8 (ファイル検索): H3 を severity 3 → 0 に再評価 (PH-420 で解消)
- ケース 1-3, 5 (H10): 各 severity 3 → 1 に再評価 (PH-418 + PH-424 で actions slot 化)
- ケース 1, 2 (H9): launch エラー扱い改善 (PH-417 + PH-422)

## 解決理屈

- Codex Q5 #4 の解消、UX 業界標準 (複数導線 EmptyState) に追従
- batch-93 の整理として use-case-friction-v2 の severity を実装ベースで再カウント
- batch-94 の優先順位を更新 (Polish Era 完走判定の前提)

## メリット

- 複数導線で初心者ユーザがスムーズに開始可能
- severity 3 残数が batch-93 完走後に明確化
- Polish Era 完走判定が「実装+テスト」ベースに昇格

## デメリット

- EmptyState API が拡張、後方互換は保つが API surface 増加
- 既存呼び出し全箇所 (Library / Workspace) を action → actions に書き直す必要

## 受け入れ条件

- [ ] EmptyState に `actions: Action[]` prop 追加、単一 `action` も後方互換
- [ ] Library 空状態を 3 actions に更新
- [ ] Workspace 空状態を 3 actions に更新 (該当箇所が無ければ skip + 理由記録)
- [ ] use-case-friction-v2.md severity 集計を batch-93 実装ベースで再カウント
- [ ] dispatch-log に batch-93 完走 + Codex Q5 指摘解消サマリ + batch-94 候補
- [ ] EmptyState.test.ts に複数 actions ケース追加
- [ ] `pnpm verify` 全通過

## SFDIPOT 観点

- **F**unction (機能): EmptyState 複数導線
- **U**ser expectations (ユーザ期待): Steam / Playnite 同等の onboarding hint
- **O**perations (運用): use-case-friction の最新化

参照: Codex review-batch-92.md Q5 #4 / use-case-friction-v2.md
