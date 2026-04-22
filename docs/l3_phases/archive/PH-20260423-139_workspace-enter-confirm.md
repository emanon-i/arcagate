---
id: PH-20260423-139
title: Workspace 編集モード Enter キー確定ショートカット追加
status: done
batch: 30
priority: medium
created: 2026-04-23
scope_files:
  - src/lib/components/arcagate/workspace/WorkspaceLayout.svelte
  - src/lib/components/arcagate/workspace/WorkspaceHintBar.svelte
parallel_safe: false
depends_on:
  - PH-20260423-138
---

## 背景/目的

編集モード（editMode = true）中に、"完了" ボタン（WorkspaceSidebar）のクリックだけでなく
`Enter` キーで `confirmEdit()` を呼べるようにする。
ヒントバーにも `<kbd>Enter</kbd> 確定` を追記してショートカットを明示する。

現状: `Esc` → キャンセル、`Del`/`Backspace` → 削除確認 は実装済み。
`Enter` → 確定のみ未実装。

## 実装ステップ

### Step 1: onkeydown ハンドラに Enter 追加

`WorkspaceLayout.svelte` の `onkeydown` 内（186-196行付近）に:

```svelte
} else if (e.key === 'Enter' && editMode && !deleteConfirmId && !renameOpen) {
    e.preventDefault();
    confirmEdit();
}
```

### Step 2: ヒントバーにショートカットを追記

`WorkspaceHintBar.svelte`（PH-138 で切り出し後）、または
WorkspaceLayout のヒントバー部分に `<kbd>Enter</kbd> 確定` を追加。

表示例: `<kbd>Esc</kbd> 終了 | <kbd>Enter</kbd> 確定 | <kbd>Del</kbd> 削除`

### Step 3: E2E テスト追加

`tests/e2e/workspace-editing.spec.ts` に:

- 編集モード中に `page.keyboard.press('Enter')` → 編集モードが終了することを確認

## 受け入れ条件

- [ ] `pnpm verify` 全通過
- [ ] 編集モード中に Enter キーを押すと編集が確定されること（実機確認）
- [ ] ダイアログ表示中（削除確認・名前変更）は Enter が confirmEdit() をトリガーしないこと
- [ ] ヒントバーに「Enter 確定」が表示されること（実機確認）
- [ ] E2E テストが追加・通過すること
