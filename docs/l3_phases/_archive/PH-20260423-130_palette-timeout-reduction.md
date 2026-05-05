---
id: PH-20260423-130
title: palette.spec.ts — cb: テスト waitForTimeout 除去 + debounce テスト見直し
status: todo
batch: 28
priority: medium
created: 2026-04-23
scope_files:
  - tests/e2e/palette.spec.ts
parallel_safe: true
depends_on: []
---

## 背景/目的

`palette.spec.ts` に残る `waitForTimeout` のうち:

- `cb:` テスト（PH-118 で追加）の `waitForTimeout(200)` は `expect(results).toBeVisible()` に変換可能
- debounce テストの `waitForTimeout(300)` × 2 は debounce の完了を待つために必要だが、
  `page.waitForFunction` や入力クリア後の DOM 変化で代替できる可能性がある

## 実装内容

1. `cb:` テストの `waitForTimeout(200)` を除去
   （すぐ後の `await expect(results).toBeVisible()` が待機するため不要）
2. debounce テストの `waitForTimeout(300)` を評価し、不要なら除去、必要なら維持

## 受け入れ条件

- [ ] `cb:` テストから `waitForTimeout` が除去されること
- [ ] debounce テストの `waitForTimeout` が評価・整理されること
- [ ] biome 0 errors
