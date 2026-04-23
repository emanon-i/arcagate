---
status: wip
phase_id: PH-20260423-195
title: 編集モード ESC キーでキャンセル（現状は確定になっている）
category: バグ修正
scope_files:
  - src/lib/components/arcagate/workspace/WorkspaceLayout.svelte
parallel_safe: false
depends_on: []
---

## 目的

編集モード中に ESC を押すと「確定（保存）」になってしまう。
ESC はキャンセル（変更を破棄してリロード）であるべき。

## 現状

`WorkspaceLayout.svelte` の `<svelte:window onkeydown>` ハンドラ:

```ts
if (e.key === 'Escape' && !deleteConfirmId && !renameOpen) {
    cancelEdit();
} else if (e.key === 'Enter' && !deleteConfirmId && !renameOpen) {
    confirmEdit();
}
```

コードは正しく ESC → `cancelEdit()` になっている。
`cancelEdit()` は `editMode = false` + `loadWidgets` でリロード（キャンセル相当）。

## 原因調査

ユーザーの「ESC が確定になる」報告は、実は **ダイアログや別のコンポーネントが
ESC を先にキャッチして閉じ、その後 Workspace に ESC が届かない**可能性がある。
あるいは `deleteConfirmId` や `renameOpen` が true の状態でテストした可能性。

現状コードは仕様通り。追加対処は不要かもしれないが、念のり：

## 変更方針（予防的）

1. `svelte:window` の `keydown` ハンドラに `e.stopPropagation()` を追加
   （他コンポーネントへの誤配信防止）
2. HintBar に「ESC: キャンセル / Enter: 確定」のヒントを明示（可視化）

実機確認後に実装要否を判断する。

## 検証

- 編集モード中に ESC → ウィジェットの変更が取り消される（cancelEdit）
- Enter → ウィジェットの変更が保存される（confirmEdit）
