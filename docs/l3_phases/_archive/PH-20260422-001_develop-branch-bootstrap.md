---
status: done
phase_id: PH-20260422-001
title: develop ブランチ初期化 + feature/ui-dx-refinement を develop に取り込む
depends_on: []
scope_files:
  - "(git operations only)"
parallel_safe: false
---

# PH-20260422-001: develop ブランチ初期化

## 目的

ディスパッチ運用のための統合ブランチ `develop` を作成し、既に完成している
`feature/ui-dx-refinement`（PH-20260311-001 / 002）を develop に取り込む。
これが完了するまで以降の Plan は実行できない。

## 参照ドキュメント

- `docs/dispatch-operation.md` §1, §4
- 親 L3: `docs/l3_phases/PH-20260311-002_ui-feedback-overhaul.md`（status: wip のまま置いておく。本フェーズでは触らない）

## 実装ステップ

### Step 1: develop ブランチ作成

1. `git fetch origin`
2. `git switch main && git pull --ff-only origin main`
3. `git switch -c develop`
4. `git push -u origin develop`

**コミット**: なし（ブランチ作成のみ）

### Step 2: feature/ui-dx-refinement を develop に取り込む PR

1. `git switch feature/ui-dx-refinement`
2. `git pull --ff-only origin feature/ui-dx-refinement || true`（未 push のコミットがある場合に備える）
3. `git push origin feature/ui-dx-refinement`（ディスパッチ投入時点の最新コミット
   `98ea981` = "docs: ディスパッチ運用マニュアル + L3 Plan 5本" を origin に反映）
4. `gh pr create --base develop --head feature/ui-dx-refinement\
   --title "[PH-20260311-001/002] UI/UX リファインメント + 実機フィードバック UI 全面改修"\
   --body-file - <<EOF

## 対応 Plan

- PH-20260311-001 (done, commit f3d41af)
- PH-20260311-002 (実装完了、実機未検証 3 項目は PH-20260422-002/003/004 で対応)

## 変更サマリ

- UI/UX 原則適合リファインメント 19 件
- 実機フィードバック UI 全面改修 35 件

## 検証

- pnpm verify 通過
- E2E 28/28 通過
- 実機未検証 3 項目（S-6-2 / S-8-3 / S-6-6）は後続 Plan で検査
  EOF`

5. CI 完了を待つ: `gh pr checks --watch`

### Step 3: develop へマージ

1. CI 緑を確認
2. `gh pr merge --merge --delete-branch`（squash ではなく **通常 merge**。親フェーズの commit 履歴を失わないため）
3. `git switch develop && git pull --ff-only origin develop`

### Step 4: PH-20260311-002 を archive に移動

PH-20260311-002 は status: wip のまま commit されているが、3 つの実機未検証項目は
後続 Plan に分離したため、ここで archive に移動する。

1. `git switch -c chore/archive-ph-20260311-002 develop`
2. `git mv docs/l3_phases/PH-20260311-002_ui-feedback-overhaul.md docs/l3_phases/archive/`
3. `git mv docs/l3_phases/PH-20260311-001_ui-ux-refinement.md docs/l3_phases/archive/`
4. `git commit -m "chore: PH-20260311-001/002 を archive に移動（実機未検証3項目は PH-20260422-002/003/004 に分離）"`
5. `git push -u origin chore/archive-ph-20260311-002`
6. `gh pr create --base develop --title "chore: PH-20260311-001/002 を archive に移動" --body "PH-20260422-002/003/004 に引き継ぎ済み"`
7. CI 緑を待ってマージ

### Step 5: 本 Plan の完了処理

1. `git switch -c chore/archive-ph-20260422-001 develop`
2. 本ファイルの frontmatter `status: todo` → `status: done` に変更
3. `git mv docs/l3_phases/PH-20260422-001_develop-branch-bootstrap.md docs/l3_phases/archive/`
4. コミット: `chore: PH-20260422-001 完了・archive`
5. push → PR → CI 緑でマージ

## 受け入れ条件

- [ ] `origin/develop` が存在し、HEAD に PH-20260311-001/002 のコミットが含まれる
- [ ] `origin/feature/ui-dx-refinement` は削除済み
- [ ] `docs/l3_phases/` に PH-20260311-001__.md / PH-20260311-002__.md が存在せず、archive 側にある
- [ ] `docs/l3_phases/` に PH-20260422-001_develop-branch-bootstrap.md が存在せず、archive 側にある
- [ ] `docs/l3_phases/` の残 Plan は PH-20260422-002/003/004/005 の 4 件（他に追加 Plan があればそれも todo のまま）
- [ ] develop ブランチの最新コミットで `pnpm verify` 通過

## Exit Criteria

上記受け入れ条件 6 つがすべて [x]

## 停止条件（§5 暴走ブレーキの補足）

- `gh pr merge` が権限エラーで失敗 → CLI 認証確認が必要なので即停止
- main への push が誤って発生しそうになった → 即停止
