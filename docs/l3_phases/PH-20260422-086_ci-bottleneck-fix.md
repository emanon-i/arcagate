---
id: PH-20260422-086
title: CI ボトルネック解消（lint/test/build 分割 + path filter）
status: todo
batch: 17
priority: high
created: 2026-04-22
---

## 背景/目的

`feature/ui-dx-refinement` の CI "check" ジョブが **32m25s** かかっている。
大部分は `tauri build`（リリースバイナリのフルコンパイル）が占めており、
docs 修正や E2E テスト修正だけの PR でも毎回 25-30 分ブロックされる状態。

## 現状計測

| ジョブ     | 所要時間 | 備考                                          |
| ---------- | -------- | --------------------------------------------- |
| CI "check" | 32m25s   | Tauri build がほぼ全体                        |
| E2E "e2e"  | 9m12s    | setup ~4m + cargo build(debug) ~3m + test ~2m |

## 制約

- GitHub Actions の `windows-latest` ランナーのみ使用（Linux 不可。Tauri + WebView2 の制約）
- `Swatinem/rust-cache` は引き続き使用（キャッシュ有効）
- 全チェック（biome/dprint/clippy/cargo test/tauri build）は残す。**削除しない**

## 手法

### ステップ 1: CI ジョブ分割

1 ジョブ → 3 ジョブに分割し、`lint` と `test` を並列化：

```
lint (5-7min)          test (3-4min)
  biome / dprint          cargo test (debug)
  clippy / rustfmt        vitest
  svelte-check            
                    ↓（両方成功後）
              build (25-28min)
                tauri build (release)
```

**メリット**：docs/test-only PR は `lint` + `test` のみ走る（~5 分）。
`tauri build` は src 変更時のみ実行。

### ステップ 2: path filter で build をスキップ

`build` ジョブに `if` 条件を追加：

```yaml
build:
  needs: [lint, test]
  if: |
    github.event_name == 'push' ||
    contains(github.event.pull_request.changed_files, 'src/') ||
    contains(github.event.pull_request.changed_files, 'src-tauri/')
```

または `paths` フィルタを workflow に追加して pull_request トリガーを制御。

**注意**：GitHub Actions の `paths` フィルタは workflow トリガーレベルで制御するほか、
`dorny/paths-filter` action で動的に判定する方法も有効。

### ステップ 3: E2E への vitest 移動検討

vitest (unit tests) は現在 CI "check" に含まれているが、
E2E と同じジョブに移動するか独立させることも検討（今回スコープ外）。

## 受け入れ条件

- [ ] CI "check" ジョブが `lint` / `test` / `build` の 3 ジョブに分割されている
- [ ] `lint` と `test` が並列実行される
- [ ] docs のみ変更する PR で `build` ジョブがスキップされる
- [ ] src-tauri 変更を含む PR では `build` ジョブが実行される
- [ ] `pnpm verify` は変更なし（ローカル検証は維持）
- [ ] main ブランチへの push では引き続き全ジョブが実行される

## 選定理由と却下案

| 案                       | 結論     | 理由                                                                        |
| ------------------------ | -------- | --------------------------------------------------------------------------- |
| sccache 追加             | 却下     | Windows runner での効果が限定的。セットアップコストに対してリターンが小さい |
| cargo nextest            | 却下     | テスト時間は 3-4m 以内で改善余地が小さい                                    |
| self-hosted runner       | 却下     | 運用コスト増。個人プロジェクトに不釣り合い                                  |
| ジョブ分割 + path filter | **採用** | 実装コスト低・効果大。docs/E2E 修正 PR の体感が劇的改善                     |
