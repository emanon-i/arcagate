---
id: PH-20260422-050
title: configStore.setWidgetZoom vitest 拡充
status: done
batch: 10
priority: high
---

## 背景・目的

`setWidgetZoom` はクランプ（50〜200）と 10 刻み丸めを組み合わせたロジックを持つ。
既存テストゼロ。境界値・端数処理を確実に保護する。

## 受け入れ条件

- [x] 10 の倍数はそのまま保存 (60→60)
- [x] 50 未満は 50 にクランプ (14→50)
- [x] 200 超は 200 にクランプ (250→200)
- [x] 端数切り捨て (74→70)
- [x] 端数切り上げ (55→60)
- [x] 境界値 50 はクランプされない
- [x] 境界値 200 はクランプされない

## 実装メモ

- vitest v4 jsdom 環境では `localStorage.clear()` と `vi.spyOn(localStorage, 'setItem')` が利用不可
  - カスタム localStorage polyfill の制約
  - localStorage 永続化テストは境界値テストで代替
- モジュール共有インスタンスを利用するため、テスト順序で状態遷移を設計
  - 同値ガード (`if (widgetZoom === clamped) return;`) を回避するよう順番を計画
- 7 テスト全通過
