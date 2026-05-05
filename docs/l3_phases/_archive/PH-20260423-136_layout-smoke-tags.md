---
id: PH-20260423-136
title: layout.spec.ts @smoke タグ追加（基本レイアウト検証）
status: done
batch: 29
priority: medium
created: 2026-04-23
scope_files:
  - tests/e2e/layout.spec.ts
parallel_safe: true
depends_on: []
---

## 背景/目的

`layout.spec.ts` には `@smoke` タグがなく PR E2E で検証されない。
サイドバーの高さ、TitleBar のボタン配置、ウィンドウボタン存在確認などの
基本レイアウトテストは UI リグレッション検知として smoke に適している。

## 実装内容

以下のテストに `{ tag: '@smoke' }` を追加:

1. 「サイドバーが viewport 下端まで伸びること（#23 修正検証）」
2. 「TitleBar のボタンが存在すること（#1, #2 修正検証）」

これらは外部依存なし（IPC 不要）かつ実行が速い。

## 受け入れ条件

- [ ] 少なくとも 2 件のテストに `@smoke` タグが追加されること
- [ ] biome 0 errors
