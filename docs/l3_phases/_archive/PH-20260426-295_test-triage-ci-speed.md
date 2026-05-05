---
id: PH-20260426-295
status: done
batch: 68
type: 改善
---

# PH-295: テスト triage + CI 速度向上（PR ターン 5 分目標）

## 横展開チェック実施済か

- 既存 `tests/e2e/*.spec.ts` 22 ファイル + `src/**/*.test.ts` 15 ファイルを全件分類
- `playwright.config.ts` の `globalTimeout` 1200s（CI）を維持しつつ、smoke 数を絞ることで実行時間短縮
- engineering-principles.md §6 テストピラミッドの方針を「現フェーズ = UX 反復最適化期 = 最小テスト」に上書き

## 参照した規約

- `arcagate-engineering-principles.md` §6 テストピラミッド（後で復元前提で原則自体は維持）
- `dispatch-operation.md` §5 暴走ブレーキ（CI 2 回連続失敗で停止）
- `lessons.md` テスト関連教訓（Playwright timing / @smoke 選定基準）

## 背景・目的

ユーザフィードバック (2026-04-26):

> PR が長すぎる、E2E まだ早かった、ここまで過剰保護するターンじゃない。E2E やめる or 最低限変わらない部分だけに絞る。通常テストも必要最小限にしたい。普通に速くする手立ても調べて考えてほしい。

現フェーズは UX 反復最適化期。**過剰なテスト = 反復速度の足かせ**。コア仕様が安定するまでテストは最小限、速度を優先。

PR ターン目標: 現状 20-30 分 → **5 分以内**。

## 仕様

### A. E2E 削減（PR で走るのは `@core` 5 件のみ）

`@smoke` タグから `@core` タグに移行（より厳格な意味付け）。
core 候補（5 件以下）:

1. `layout.spec.ts:102` — TitleBar ボタン存在
2. `items.spec.ts:6` — IPC アイテム作成 → 一覧反映
3. `workspace.spec.ts:6` — ワークスペース作成
4. `palette.spec.ts:8` — パレットボタン存在
5. `settings.spec.ts:24` — 設定パネル開閉

残り全 spec の @smoke は `@nightly` タグに置換 → push / workflow_dispatch でのみ実行（PR ブロックしない）。

`playwright.config.ts` で `--grep @core` を `pnpm test:e2e:smoke` に。
nightly は別 workflow で週 1 or daily 実行、failure は監視のみ。

### B. vitest 削減

#### keep（純粋関数 / 型 / IPC payload）

- `utils/detect-type.test.ts`
- `utils/format-target.test.ts`
- `utils/widget-config.test.ts`
- `utils.test.ts`
- `types/palette.test.ts`
- `styles/arcagate-theme.test.ts`

#### drop（UI store 結合 / 実装密結合）

- `state/config.svelte.test.ts`
- `state/hidden.svelte.test.ts`
- `state/items.svelte.test.ts`
- `state/palette.svelte.test.ts`
- `state/sound.svelte.test.ts`
- `state/theme.svelte.test.ts`
- `state/toast.svelte.test.ts`
- `state/workspace.svelte.test.ts`
- `utils/sfx.test.ts`

drop ファイルは削除ではなく `*.test.ts.bak` に rename + `.gitignore` に追加 or 直接削除（後で再生成簡単）。判断: **削除**（git history で復活可能）。

### C. Rust テスト

cargo test 157 件中、boilerplate な test を間引く判断は次バッチへ。本 Plan では現状維持（既に 1.3 秒で完走、ボトルネックでない）。

### lefthook pre-push bug 原因究明（batch-67 で発覚、batch-68 で修正）

#### 症状

`git push` 経由で lefthook pre-push が走ると、`cargo test --quiet` が exit 0 で終わるにも関わらず lefthook が **失敗扱い**（🥊 マーク）にして push 拒否。手動で `lefthook run pre-push` を実行すると同じコマンドが ✔️ で成功。

加えて pre-push 内で内部的に呼ばれる `git rev-parse --path-format=absolute --show-toplevel --git-path hooks --git-path info --git-dir` が `fatal: this operation must be run in a work tree` で失敗。

#### 原因

1. common config（`E:/Cella/Projects/arcagate/.git/config`）の `[core] bare = true` が worktree に継承される
2. worktree では `is-inside-work-tree = false` 扱いとなり、`--show-toplevel` 系 rev-parse が fatal
3. lefthook が rev-parse 失敗で hook 全体を fail 判定する

`git config extensions.worktreeConfig = true` は設定済みだが、各 worktree の `config.worktree` に `core.bare = false` を **明示 override** しないと common 値が継承される。

#### 修正方針（batch-68 で実装）

A. **setup script** `scripts/setup-worktree.sh`:

```bash
#!/usr/bin/env bash
git config --worktree core.bare false
echo "core.bare=false set for $(git rev-parse --show-toplevel)"
```

新規 worktree 作成時に必ず実行（CONTRIBUTING.md に手順記載）。

B. **CI / lefthook 整合**: pre-push hook を復活、cargo test --quiet → cargo test（出力ありの方が lefthook の判定安定？要検証）or `cargo nextest`（高速、安定）に置換検討。

C. **代替**: pre-push を撤廃し、`pre-commit + cargo check`（test なし）+ CI で test 担保 という設計に変更も選択肢。

### D. CI workflow 高速化

#### `.github/workflows/ci.yml` 修正

1. **dprint check を CI から削除**（pre-commit hook で十分、`lefthook.yml` 既存）
2. **lint と test を 1 job に統合** (setup 重複排除)
3. **build job を docs-only PR で skip**（現状 paths-filter で対応済、再確認）
4. **build job の `pnpm tauri build` を debug-only に**（PR で release を走らせない、push のみ）

#### `.github/workflows/e2e.yml` 修正

1. PR では `@core` のみ実行（`pnpm test:e2e:core`）
2. nightly workflow を別ファイル `e2e-nightly.yml` で daily スケジュール（既存）

### E. 機械化

- `pnpm test:e2e:core` script を package.json に追加 (`playwright test --grep @core`)
- 既存 `pnpm test:e2e:smoke` は維持（ローカルで全 smoke 走らせたい時用）

## 受け入れ条件

- [ ] CI workflow から dprint step 削除
- [ ] lint + test を 1 job に統合（または lint job 内に test step 追加）
- [ ] build job を `--debug` mode で実行（PR の場合）or skip
- [ ] PR E2E が `@core` 5 件のみ
- [ ] vitest が utils + types のみ（state/* drop）
- [ ] PR CI 全完了が 5 分以内に収まる（実測値を dispatch-log に記録）
- [ ] `pnpm verify` 全通過

## 自己検証

- 削減後の CI 実行時間 (lint+test+e2e+build) を計測 → dispatch-log に before/after
- core 5 件が全 pass する保証
- pre-commit hook で dprint がローカルで走る確認

## 復元方針

「コア安定後にテスト復元」を前提:

- nightly E2E は drop せず保持（PR ブロックしないだけ）
- vitest state/* は git history から復元可能
- engineering-principles.md §6 はテストピラミッド原則自体を残し、現フェーズの方針を §6.1 として追加（後で消せる）
