#!/usr/bin/env bash
# setup-worktree.sh
#
# 新規 git worktree を切ったあと、開発前に必ず実行する。
#
# ## 何をするか
#
# 1. core.bare = false を worktree config に明示設定
#    common config に core.bare = true が継承されるため、worktree 内で
#    `is-inside-work-tree = false` 扱いになり、`git rev-parse --show-toplevel`
#    が fatal を返す。lefthook pre-push が失敗扱いになる原因。
#
# 2. pnpm install を実行
#    worktree ごとに node_modules が必要（root から symlink されない）
#
# ## 使い方
#
# ```bash
# git worktree add .claude/worktrees/<name> -b <branch>
# bash scripts/setup-worktree.sh
# ```

set -euo pipefail

cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

# 1. core.bare = false を worktree config に
git config --worktree core.bare false
echo "✔️ core.bare=false set for $(pwd)"

# 2. is-inside-work-tree 確認
if [ "$(git rev-parse --is-inside-work-tree 2>&1)" != "true" ]; then
	echo "❌ is-inside-work-tree が true ではない。git config を確認してください。"
	exit 1
fi
echo "✔️ git rev-parse --is-inside-work-tree = true"

# 3. node_modules
if [ ! -d node_modules ]; then
	echo "→ pnpm install を実行..."
	pnpm install --frozen-lockfile
fi
echo "✔️ node_modules ready"

echo ""
echo "Worktree setup complete. lefthook hooks should now work via git push."
