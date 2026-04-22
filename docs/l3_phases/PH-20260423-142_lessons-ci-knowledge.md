---
id: PH-20260423-142
title: lessons.md に batch-29/CI fix 知見を追記
status: todo
batch: 30
priority: low
created: 2026-04-23
scope_files:
  - docs/lessons.md
parallel_safe: true
depends_on: []
---

## 背景/目的

batch-29 実装後の E2E CI fix 3 件（直 push）で判明した知見を `docs/lessons.md` に記録する。
具体的な知見:

1. `webServer.timeout` の重要性（Vite 起動に 60s+ かかる場合がある）
2. `globalTimeout` は CI / ローカルで分けると良い
3. `waitForSelector` vs `waitForTimeout` の使い分け

## 実装ステップ

### Step 1: lessons.md に追記

以下の 3 項目を `## Playwright E2E（Tauri v2 + WebView2 CDP）` セクションまたは
新設 `## CI 安定化パターン` セクションに追記:

```markdown
### webServer.timeout の設定（CI Windows runner 対策）

- Windows CI runner では Vite 起動に 60〜120s かかることがある
- `playwright.config.ts` の `webServer.timeout` を `120_000`（2分）以上に設定する
- デフォルト値は 60s で、CI でのみタイムアウトが発生するフレーキーになる

### globalTimeout の推奨設定

- ローカル: 300_000（5分）で十分
- CI: 600_000（10分）が安全マージン
- 環境変数 `process.env.CI` で分岐する方法: `globalTimeout: process.env.CI ? 600_000 : 300_000`

### @smoke タグの設計原則

- smoke テストは「アプリが壊れていないか」を素早く確認する最小セット
- 1 テスト 30s 以内を目安にする
- waitForTimeout は使わず、DOM 変化を waitForSelector / expect().toBeVisible() で待つ
```

## 受け入れ条件

- [ ] `pnpm verify` 全通過（dprint チェック通過）
- [ ] lessons.md に 3 項目以上の知見が追記されていること
