---
id: PH-20260422-057
title: toastStore vitest 拡充（境界値・独立タイムアウト）
status: done
batch: 11
priority: medium
---

## 背景・目的

`toast.svelte.ts` は既存テストが 5 件あるが、境界値（2999ms）と
独立タイムアウト（複数トーストの非干渉）が未テスト。

## 受け入れ条件

- [x] 2999ms では自動削除されない（境界値）
- [x] 複数トーストが独立したタイムアウトを持つ（1500ms + 1500ms で先のみ削除）
- [x] `vi.useFakeTimers()` / `vi.useRealTimers()` で制御
- [x] 既存テストとの干渉なし（累積 id を `find()` で追跡）

## 実装メモ

- `vi.advanceTimersByTime(2999)` で境界確認
- タイムアウト独立性テスト: 先に add → 1500ms → 後に add → 1500ms で差を検証
- 合計 7 テスト（5 既存 + 2 追加）
