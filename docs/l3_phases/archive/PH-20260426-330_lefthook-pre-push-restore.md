---
id: PH-20260426-330
status: deferred
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

- [ ] lefthook.yml の pre-push 復活 → **batch-76 持ち越し**
- [ ] git push 経由で svelte-check + cargo test が動作することを確認

## batch-75 検証結果（持ち越しの理由）

実機 git push を行ったところ、cargo test の `utils::git::tests` 3 件が lefthook
pre-push 経由でのみ fail する症状を確認:

```
failures:
    utils::git::tests::test_git_status_branch_name
    utils::git::tests::test_git_status_clean_no_changes
    utils::git::tests::test_git_status_has_changes
```

直接 `cargo test --manifest-path src-tauri/Cargo.toml utils::git` を叩くと 5/5 件 pass。
lefthook 経由で fail する原因は次のいずれか想定:

- worktree 内の git config が tempdir の `git init` に継承される（core.bare 等）
- lefthook pre-push の env が `GIT_*` 変数を変更し、テスト中の git 実行に影響
- 並列実行で svelte-check と git の disk lock 競合

batch-76 で `scripts/diagnose-lefthook.sh` を pre-push に一時挿入し、env の差分を捕捉する。
