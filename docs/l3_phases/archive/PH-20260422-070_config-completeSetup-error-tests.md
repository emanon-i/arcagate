---
id: PH-20260422-070
title: configStore completeSetup + error state テスト追加
status: done
batch: 14
---

## 目的

completeSetup と IPC エラー時の error state テストを追加。

## 受け入れ条件

- completeSetup() → setupComplete が true になる
- loadConfig() IPC エラー → error state が設定される
- saveHotkey() IPC エラー → error state が設定される

## 検証

- pnpm verify 通過
