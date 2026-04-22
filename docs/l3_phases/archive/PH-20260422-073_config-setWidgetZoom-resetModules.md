---
id: PH-20260422-073
title: configStore setWidgetZoom テストに vi.resetModules() 追加・コメント整理
status: done
batch: 14
---

## 目的

config.svelte.test.ts の setWidgetZoom describe に vi.resetModules() を追加。
「意図的な状態共有」コメントを除去し、各テストを独立化。

## 検証

- pnpm verify 通過（DEFAULT_ZOOM=100 と全テスト値が異なるため互換性あり）
