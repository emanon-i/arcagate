---
id: PH-20260423-141
title: playwright.config.ts webServer.timeout 最適化 + @smoke 実行確認
status: todo
batch: 30
priority: medium
created: 2026-04-23
scope_files:
  - playwright.config.ts
parallel_safe: true
depends_on: []
---

## 背景/目的

batch-29 事後の CI fix 3 件（`4215f55`, `0c66441`, `ed4aeb3`）が main に直 push された。
内容:

- `globalTimeout: 600_000`（10分）
- `webServer.timeout: 120_000`（2分）
- `waitForSelector` の最適化

これらが正しく playwright.config.ts に反映されているか確認し、
設定値の妥当性（過剰/不足）をレビューして最終調整を行う。

## 実装ステップ

### Step 1: 現状確認

`playwright.config.ts` を読み込み、以下を確認:

- `globalTimeout` の値
- `webServer.timeout` の値
- `expect.timeout` の値（PH-133 で 10s に設定済みのはず）
- `timeout`（test タイムアウト）の値

### Step 2: 設定値レビューと最適化

- `globalTimeout: 600_000` はローカル実行でも適用される → ローカル 300s / CI 600s に分ける場合は環境変数で制御
- `webServer.timeout: 120_000` は Vite 起動 2 分待ちで適切
- `expect.timeout: 10_000` は IPC レイテンシを考慮して適切

不要な過剰マージンがあれば削減。

### Step 3: @smoke テスト一覧確認

`grep -r "@smoke" tests/e2e/` で現在の @smoke タグ付きテストを列挙。
カバレッジ（何のシナリオをテストしているか）を確認し、
明らかに欠けているシナリオがあれば次 Plan の候補としてメモ。

## 受け入れ条件

- [ ] `pnpm verify` 全通過
- [ ] `playwright.config.ts` に `webServer.timeout: 120_000`, `expect.timeout: 10_000` が設定されていること
- [ ] @smoke テスト一覧がコメントまたは dispatch-log に記録されていること
