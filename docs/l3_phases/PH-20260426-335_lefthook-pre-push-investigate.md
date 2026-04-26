---
id: PH-20260426-335
status: todo
batch: 76
type: 改善
---

# PH-335: lefthook pre-push 復活（worktree 内 cargo test git_status fail 究明）

## 横展開チェック実施済か

- batch-75 で発覚した症状: `lefthook run pre-push` は通るが、実機 git push 経由では `utils::git::tests` 3 件が fail
- diagnose-lefthook.sh は既存（batch-68 で作成）→ 一時挿入で env 差分を捕捉する

## 仕様

- pre-push に diagnose ステップを一時的に追加し、git push してログ取得
- env / pwd / git config worktree / GIT_* 変数を比較
- 原因が core.bare 継承なら `git -C <tempdir> -c core.bare=false ...` で対処
- 原因が GIT_DIR / GIT_WORK_TREE 環境変数の lefthook 設定なら unset を pre-push 内で行う
- 確定したら lefthook.yml の pre-push を再有効化

## 受け入れ条件

- [ ] diagnose ログを dispatch-log に記録
- [ ] cargo test 全件 pass で git push 通過
- [ ] lefthook.yml の pre-push 再有効化
- [ ] `pnpm verify` 全通過
