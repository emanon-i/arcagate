---
id: PH-20260422-087
title: E2E テスト S/A/B トリアージ + B 削除 / A nightly 分離
status: todo
batch: 17
priority: medium
created: 2026-04-22
---

## 背景/目的

E2E テストが増加し（58 件 / 53 pass / 5 skip）、CI E2E ジョブが 9 分かかっている。
今後も増え続けることが予想され、PR ごとにフル実行するコストが上昇する。
テストを S/A/B でランク分けし、B は削除または unit test 化、A は nightly に分離する。

## 現状

| 指標             | 値                                              |
| ---------------- | ----------------------------------------------- |
| E2E 総数         | 58（うち 5 skip）                               |
| CI 所要時間      | 9m12s（setup ~4m + cargo build ~3m + test ~2m） |
| ローカル所要時間 | 1m24s（53 pass）                                |

**課題**：CI でのセットアップ（Rust build, Playwright install）に実テスト時間の 3-4 倍かかっており、
テスト数が増えるほど比率が悪化する。

## ランク定義

| ランク | 基準                                                                    |
| ------ | ----------------------------------------------------------------------- |
| S      | コア機能（CRUD/起動/保存）。失敗 = 本番リリース不可。PR ごとに必須      |
| A      | UX 機能（検索/フィルタ/ショートカット）。重要だが失敗 = blocking でない |
| B      | 実装詳細の確認・重複・unit test で代替可能。E2E としての追加価値が低い  |

## 各スペックのトリアージ

| ファイル                        | テスト数 | ランク | 理由                                           |
| ------------------------------- | -------- | ------ | ---------------------------------------------- |
| `library.spec.ts`               | -        | **S**  | アイテム CRUD の本流                           |
| `workspace.spec.ts`             | 5        | **S**  | ワークスペース作成/ウィジェット追加の本流      |
| `palette.spec.ts`               | 5        | **S**  | パレット起動/検索/nav の本流                   |
| `widget-context-panel.spec.ts`  | 4        | **A**  | Esc/閉じるボタン/右クリック詳細パネル          |
| `workspace-editing.spec.ts`     | 5        | **A**  | D&D/リサイズ/削除確認（CI で時々 flaky）       |
| `library-search.spec.ts`        | 5        | **A**  | 検索ショートカット・クリアボタン               |
| `library-tag-filter.spec.ts`    | -        | **A**  | タグフィルタ                                   |
| `library-empty-starred.spec.ts` | 3        | **B**  | 空状態/starred（starred は skip 中）           |
| `widget-zoom.spec.ts`           | 3        | **B**  | zoom は localStorage 操作で unit test 代替可能 |
| `visual.spec.ts`                | 3        | **A**  | ビジュアルリグレッション（snapshot 比較）      |
| `settings.spec.ts`              | 2        | **B**  | IPC 疎通のみ。unit test で十分                 |
| `layout.spec.ts`                | -        | **B**  | レイアウト確認のみ。visual.spec と重複         |

## 手法

### ステップ 1: B ランク削除・unit test 化

| テスト                          | 対処                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------- |
| `widget-zoom.spec.ts`           | `configStore.svelte.test.ts` へ zoom 値の永続化テストを移植後、E2E スペック削除 |
| `settings.spec.ts`              | IPC 疎通は smoke-test に任せ、スペック削除                                      |
| `library-empty-starred.spec.ts` | starred テスト skip を含むため、空状態テストのみ残して starred 2件削除          |
| `layout.spec.ts`                | visual.spec.ts と重複部分を削除し、残りを visual.spec.ts に統合                 |

### ステップ 2: A ランクを nightly workflow に分離

```yaml
# .github/workflows/e2e-nightly.yml
on:
  schedule:
    - cron: '0 2 * * *'  # 毎朝 2:00 UTC
  workflow_dispatch:
```

PR ごとの E2E は S ランクのみ実行（`--grep "@smoke"` タグ付け）。

### ステップ 3: S ランクに `@smoke` タグ付け

```typescript
// library.spec.ts
test('@smoke アイテムを作成できること', ...);
```

E2E ワークフローを `--grep @smoke` に変更（PR 時は S ランクのみ）。

## 受け入れ条件

- [ ] B ランク 4 スペック（widget-zoom / settings / library-empty-starred の starred 部分 / layout）が削除または移行済み
- [ ] S ランクテストに `@smoke` タグが付いている
- [ ] PR 時 E2E は `@smoke` のみ実行（~30 秒）
- [ ] nightly.yml が S + A 全テストを実行
- [ ] `pnpm test:e2e` はローカルでは全テストを実行（既存動作維持）

## 選定理由と却下案

| 案                           | 結論     | 理由                                  |
| ---------------------------- | -------- | ------------------------------------- |
| 全テスト削除してユニットのみ | 却下     | E2E でしか検出できない統合バグがある  |
| 全テスト PR ごとに実行       | 却下     | 現状維持。CI 時間が増え続ける         |
| flaky テストを skip          | 却下     | skip は技術的負債。根本修正か削除     |
| S/A/B + nightly 分離         | **採用** | PR 体感改善 + 安全網は nightly で維持 |
