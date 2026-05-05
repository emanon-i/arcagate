---
id: PH-20260422-089
title: Node.js 24 GitHub Actions 移行
status: done
batch: 18
priority: medium
created: 2026-04-22
---

## 背景/目的

GitHub Actions の Node.js ランタイムが 2026-06-02 に強制アップグレードされる予定。
現在 CI / E2E ワークフローが `node-version: 22` を指定しているため、事前に 24 へ移行する。

## 制約

- `package.json` に `engines` フィールドなし → 変更不要
- `@types/node: ^25.3.3` は Node.js 24 API を包含 → 互換性問題なし

## 修正内容

以下 5 箇所の `node-version: 22` を `node-version: 24` に変更する。

| ファイル                            | 変更箇所                 |
| ----------------------------------- | ------------------------ |
| `.github/workflows/ci.yml`          | lint ジョブ (36行目)     |
| `.github/workflows/ci.yml`          | test ジョブ (79行目)     |
| `.github/workflows/ci.yml`          | build ジョブ (142行目)   |
| `.github/workflows/e2e.yml`         | e2e ジョブ (33行目)      |
| `.github/workflows/e2e-nightly.yml` | e2e-full ジョブ (31行目) |

## 受け入れ条件

- [ ] `pnpm verify` 全通過
- [ ] すべての CI ワークフローで `node-version: 24` が設定されていること

## scope_files

- `.github/workflows/ci.yml`
- `.github/workflows/e2e.yml`
- `.github/workflows/e2e-nightly.yml`

## parallel_safe

true
