---
id: PH-20260422-069
title: configStore loadConfig / saveHotkey / saveAutostart IPC テスト追加
status: done
batch: 14
---

## 目的

config.svelte.test.ts に IPC テストブロックを追加し、loadConfig・saveHotkey・saveAutostart をカバーする。

## 受け入れ条件

- loadConfig() → hotkey / autostart / setupComplete が設定される
- saveHotkey() → hotkey が更新される
- saveAutostart() → autostart が更新される

## 検証

- pnpm verify 通過 (109/109)
