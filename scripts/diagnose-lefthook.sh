#!/usr/bin/env bash
# diagnose-lefthook.sh
#
# lefthook pre-push hook 実行時の環境を診断する。
# git push 経由 vs lefthook run 経由で異なる環境を捕捉する。
#
# 使い方:
#   1. lefthook.yml の pre-push に diagnose を一時追加:
#        diagnose:
#          run: bash scripts/diagnose-lefthook.sh
#   2. 何かを commit して git push
#   3. /tmp/lefthook-diag.log を確認

LOG=/tmp/lefthook-diag-$(date +%s).log
{
	echo "=== lefthook diagnose $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
	echo "## pwd"
	pwd
	echo
	echo "## git env"
	env | grep -iE "^GIT_|^LEFTHOOK_" | sort
	echo
	echo "## git rev-parse"
	echo "is-inside-work-tree: $(git rev-parse --is-inside-work-tree 2>&1)"
	echo "show-toplevel: $(git rev-parse --show-toplevel 2>&1)"
	echo "git-dir: $(git rev-parse --git-dir 2>&1)"
	echo
	echo "## worktree config"
	git config --worktree --list 2>&1 | sort
	echo
	echo "## stdin"
	# pre-push hook は stdin で push 内容を受け取る（remote/url + ref pairs）
	# stdin を読むと hook が壊れるので skip
	echo "(skipped to avoid breaking hook)"
} > "$LOG" 2>&1
echo "diagnose log: $LOG"
