---
id: PH-20260423-142
title: reload パターン全テスト監査・waitForLibraryReady 適用
status: todo
priority: medium
type: test-infra
parallel_safe: true
depends_on: [PH-20260423-139]
---

# PH-20260423-142: reload パターン全テスト監査と waitForLibraryReady 適用

## 背景・目的

`page.reload()` + `waitForAppReady()` パターンは複数テストで使われている。
Library タブを対象とするテストでは、データロード完了の待機が不十分な場合に
フレーキーになる可能性がある。

全 E2E テストの reload パターンを監査し、Library データを確認するテストに
`waitForLibraryReady` を適用する。

## スコープファイル

- `tests/e2e/layout.spec.ts`
- `tests/e2e/library-tag-filter.spec.ts`
- `tests/e2e/library-empty-starred.spec.ts`
- `tests/e2e/widget-context-panel.spec.ts`
- その他 reload パターンを持つファイル

## 作業手順

1. 全 spec ファイルで `page.reload()` を grep し、その後に Library カードや要素を確認しているテストを抽出
2. Library データへのアクセスがある場合は `waitForLibraryReady` を挿入
3. 明示 timeout が不要になった箇所を整理

## 受け入れ条件

- [ ] reload 後に Library 要素を確認する全テストで `waitForLibraryReady` が呼ばれている
- [ ] または Library データを参照しない reload は変更不要と判断されている
- [ ] `pnpm exec biome check tests/` がエラーなし
- [ ] 変更対象テストが smoke ならローカル `pnpm test:e2e -- --grep @smoke` で通過確認
