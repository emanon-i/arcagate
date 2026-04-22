---
id: PH-20260423-138
title: lessons.md に batch-29 CI デバッグ知見を追記
status: todo
priority: high
type: doc
parallel_safe: true
depends_on: []
---

# PH-20260423-138: lessons.md に batch-29 CI デバッグ知見を追記

## 背景・目的

PR #57 (batch-29) の CI デバッグ中に判明した3つの新知見を
`docs/lessons.md` に追記する。batch-28 で追記した内容の続き。

## スコープファイル

- `docs/lessons.md`

## 追記内容

### 1. globalTimeout の算出方法

- **問題**: `globalTimeout: 300_000` で 16 smoke テストが連鎖タイムアウト
- **算出式**: `テスト数 × per-test-timeout × (1 + retries) + 余裕` が最低ライン
  - 16 × 60s × 2 = 1920s — 300s では全く足りない
- **対処**: `600_000`（10分）に変更。30テスト以下の smoke なら十分

### 2. webServer.timeout の CI 推奨値

- **問題**: `webServer.timeout: 60_000` で CI Windows runner が Vite 起動間に合わず
- **症状**: `Timed out waiting 60000ms from config.webServer`
- **対処**: `120_000`（2分）に変更。Vite の初回ビルドは 60s を超えることがある

### 3. starred-badge テストの @smoke 不適格確定

- 3回試みてすべて失敗 → @smoke から永久除外
- 根本原因: `updateItem` IPC → `items` ストア → `$effect` → `searchItemsInTag` IPC → DOM 更新の 2段階非同期チェーンが CI で 10s を超える
- 対処: `playwright.config.ts` の `expect.timeout: 10_000` は有効だが、このチェーンには不十分

## 受け入れ条件

- [ ] `docs/lessons.md` に上記3知見が追記されている
- [ ] `pnpm dprint fmt docs/lessons.md` が差分なし
