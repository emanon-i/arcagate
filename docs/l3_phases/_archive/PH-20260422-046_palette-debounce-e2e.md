---
id: PH-20260422-046
title: パレット debounce 回帰防衛 E2E テスト追加
status: done
batch: 9
priority: medium
created: 2026-04-22
---

## 背景/目的

パレットの検索をクリアした後、results エリアが非表示になるバグが過去に発生した（debounce
タイミング問題）。同種の回帰を検出するため、クリア後の結果エリア表示を確認するテストを追加する。

## 制約

- `tests/e2e/palette.spec.ts` に追記のみ（既存テスト不変）

## 手法

1. パレットを開く
2. 検索キーワード入力 → 300ms 待機
3. 入力クリア → 300ms 待機
4. `palette-results` が visible であること

## 受け入れ条件

- [x] テスト「検索クリア後に空の結果状態または最近の履歴が表示されること」追加
- [x] `pnpm verify` 全通過
