---
id: PH-20260422-051
title: themeStore.resolvedMode vitest 拡充
status: done
batch: 10
priority: high
---

## 背景・目的

`themeStore.resolvedMode` は `$derived` でシステムカラースキームを解決する。
jsdom では `window.matchMedia` が未定義のためスタブが必要。
"system" モード + light 切り替えの挙動を確実に保護する。

## 受け入れ条件

- [x] "dark" モード → "dark" に解決
- [x] "light" モード → "light" に解決
- [x] "system" + システム dark → "dark" に解決
- [x] "system" + システム light → "light" に解決
- [x] 存在しないカスタム ID → "dark" にフォールバック

## 実装メモ

- `window.matchMedia` を `Object.defineProperty` で定義 (jsdom 対応)
- `MediaQueryList` 型を満たすため `addListener` / `removeListener` も必要 (svelte-check 型チェック)
- `$derived(resolveMode(activeMode))` は `activeMode ($state)` が変化したときのみ再評価
  - "system" + light テスト: `setThemeMode('dark')` → `setThemeMode('system')` と 2 ステップ必要
  - 同値呼び出しでは `$derived` がキャッシュを返すため matchMedia モック差し替えが反映されない
- 5 テスト全通過
