---
id: PH-20260423-133
title: Playwright expect.timeout を 10s に設定（CI 安定化）
status: todo
batch: 29
priority: high
created: 2026-04-23
scope_files:
  - playwright.config.ts
parallel_safe: true
depends_on: []
---

## 背景/目的

`playwright.config.ts` の `expect` ブロックに `timeout` が未設定のため、
Playwright デフォルトの 5000ms が使われている。
CI の GitHub Actions Windows runner では非同期 IPC（Tauri ↔ Rust ↔ SQLite）が
5s を超えることがあり、`toBeVisible()` / `not.toBeVisible()` のタイムアウトが発生する。

batch-28 の `library-empty-starred.spec.ts` で starred バッジ消失テストが
CI のみで失敗したのはこれが原因。

## 実装内容

`playwright.config.ts` の `expect` ブロックに `timeout: 10_000` を追加する:

```ts
expect: {
  timeout: 10_000,  // ← 追加（デフォルト 5000ms → 10000ms）
  toHaveScreenshot: {
    maxDiffPixelRatio: 0.01,
  },
},
```

## 受け入れ条件

- [ ] `playwright.config.ts` に `expect.timeout: 10_000` が設定されること
- [ ] biome 0 errors（.ts ファイルのため dprint/clippy 不要）
