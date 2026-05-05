---
id: PH-20260422-053
title: vitest coverage 基盤 + lib.rs unwrap 改善
status: done
batch: 10
priority: medium
---

## 背景・目的

- `pnpm test:coverage` で state/utils/types のカバレッジレポートを生成できるようにする
- `src-tauri/src/lib.rs` の `unwrap()` を `expect()` に置き換え (clippy/品質)

## 受け入れ条件

- [x] `@vitest/coverage-v8` devDependency 追加
- [x] `vitest.config.ts` に coverage provider/reporter/include/exclude 設定
- [x] `package.json` に `"test:coverage": "vitest run --coverage"` スクリプト追加
- [x] `lib.rs` の `db_path.to_str().unwrap()` → `.expect("database path contains non-UTF-8 characters")`
- [x] `pnpm verify` 全通過

## 実装メモ

- coverage include: `src/lib/state/**/*.ts`, `src/lib/utils/**/*.ts`, `src/lib/types/**/*.ts`
- coverage exclude: `src/lib/ipc/**`, `src/lib/types/index.ts`
- reporter: `['text', 'json-summary']` (CI で json-summary を収集可能)
- rustfmt の要求で `db_path.to_str().expect(...)` は複数行形式に分割
