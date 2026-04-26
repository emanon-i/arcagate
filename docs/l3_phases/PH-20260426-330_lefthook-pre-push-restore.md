---
id: PH-20260426-330
status: todo
batch: 75
type: 改善
---

# PH-330: lefthook pre-push 復活（worktree + v2.1.1 bug 検証）

## 横展開チェック実施済か

- batch-67 で setup-worktree.sh 作成済（`git config --worktree core.bare false`）
- 現在の worktree で `git rev-parse --is-inside-work-tree` が true 返ることを確認済（batch-74 検証）
- `lefthook run pre-push` が動作することは確認済 → 真の git push でも動く想定

## 仕様

- `lefthook.yml` の pre-push コメントアウトを解除
- svelte-check + cargo test を pre-push で実行
- 実機 `git push` で動作確認、fail / pass それぞれ検証
- 失敗 case は scripts/diagnose-lefthook.sh のログを dispatch-log に記録
- README に「worktree 開発時は `bash scripts/setup-worktree.sh` を最初に実行」を 1 行追記

## 受け入れ条件

- [ ] lefthook.yml の pre-push 復活
- [ ] git push 経由で svelte-check + cargo test が動作することを確認
- [ ] setup-worktree.sh README/CLAUDE.md 等で言及
- [ ] `pnpm verify` 全通過
