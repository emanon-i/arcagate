---
id: PH-20260423-134
title: library-empty-starred starred バッジテスト @smoke 復活
status: todo
batch: 29
priority: medium
created: 2026-04-23
scope_files:
  - tests/e2e/library-empty-starred.spec.ts
parallel_safe: true
depends_on: [PH-20260423-133]
---

## 背景/目的

batch-28 で starred バッジ削除テストが CI (expect.timeout=5s) でフレークしたため、
@smoke を「空タグ選択 → 空状態メッセージ」テストに一時移動した。

PH-133 で `expect.timeout` を 10s に引き上げれば、
starred バッジの消失（IPC → $effect → searchItemsInTag 連鎖）が
10s 以内に完了するため、@smoke を starred バッジテストに戻せる。

## 実装内容

1. 「DetailPanel で ★ ボタンを押すとカードに starred バッジが表示されること」に `{ tag: '@smoke' }` を追加
2. 「アイテムのないタグを選択すると...」から `{ tag: '@smoke' }` を除去
   （このテストも残すが、smoke 対象は starred バッジテストの方が意味が大きい）

## 受け入れ条件

- [ ] starred バッジテストに `@smoke` タグが追加されること
- [ ] CI smoke でテストが pass すること（PH-133 の timeout 10s が前提）
- [ ] biome 0 errors
