---
id: PH-20260424-218
title: ThemeEditor polish（isDirty インジケータ・保存成功・閉じ時リセット）
status: done
priority: high
parallel_safe: false
scope_files:
  - src/lib/components/settings/ThemeEditor.svelte
depends_on: [PH-20260424-213, PH-20260424-214]
---

## 目的

batch-49 で実装した ThemeEditor の UX を磨く。

- 未保存変更インジケータ（isDirty）
- 保存成功フィードバック（"✓ 保存しました" 2秒表示）
- 閉じ時に未保存 CSS 変数をリセット（$effect cleanup）

## 実装内容

1. `savedCssVars` state: 保存済み変数リストを追跡。保存成功時に更新
2. `isDirty` derived: `entries` と `savedCssVars` が異なるか判定
3. `savedSuccess` state: 保存成功後 2 秒間 "✓ 保存しました" 表示
4. `$effect` cleanup: unmount 時に `savedCssVars` の値で CSS vars をリセット
5. 保存ボタン: `!isDirty` 時は disabled（変更なし時クリック不可）

## 受け入れ条件

- [ ] CSS var を変更すると "● 未保存" バッジが表示される
- [ ] 保存後に "✓ 保存しました" が 2 秒間表示される
- [ ] ThemeEditor を閉じると未保存の CSS var が元の値にリセットされる
- [ ] `pnpm verify` 全通過
