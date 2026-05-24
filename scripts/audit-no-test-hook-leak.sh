#!/usr/bin/env bash
# audit-no-test-hook-leak.sh
#
# PH-CF-600 LB-2 fix-up 機械検出:
#   (a) `__arcagateTest__` (e2e 専用 test hook) を product code (src/lib / src/routes /
#       src-tauri) から参照していないこと
#   (b) `tests/e2e/*.spec.ts` 内で **unconditional** な `test.skip(true, ...)` /
#       `test.fixme(true, ...)` が無いこと (= 「機械検出を空転させない」 原則)
#
# 動機: PH-CF-600 LB-2 が `test.skip` 同等の「test 削除 + コメント置換」 状態で merge され
# 回帰検出が空転していた。 同型の skip 漏れを再発させないため audit script で gate。
#
# 引用元 guideline:
#   docs/l3_phases/clean-feedback/PH-CF-600_library-bug-fixes.md §C2 受け入れ条件 (機械検出)
#   docs/l2_foundation/features/screens/library.md §hidden 表示契約 機械検出

set -euo pipefail

cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

VIOLATIONS=0

# (a) __arcagateTest__ の product code 参照 (tests/ と items.svelte.ts 自身は除外)。
# `grep -r src-tauri` は target/ 配下の build artifact で激重になるため、 source 拡張子に限定。
HOOK_LEAK=$(
  grep -rnE \
    --include='*.svelte' --include='*.ts' --include='*.js' --include='*.rs' \
    --exclude-dir=node_modules --exclude-dir=target --exclude-dir='.svelte-kit' --exclude-dir=build \
    '__arcagateTest__' src src-tauri/src 2>/dev/null \
    | grep -v 'src/lib/state/items.svelte.ts' \
    || true
)
if [ -n "$HOOK_LEAK" ]; then
  echo "ERROR: __arcagateTest__ test hook が product code から参照されています:"
  echo "$HOOK_LEAK" | sed 's/^/  /'
  echo "  → test hook は e2e (`tests/`) からのみ参照してください"
  echo
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# (b) unconditional `test.skip(true, ...)` / `test.fixme(true, ...)` の検出。
# 条件付き (`test.skip(!cond, ...)` 等) は環境依存 skip として許容、 unconditional は禁止。
# `tests/e2e/` 配下のみ対象 (`tests/perf/` は環境差で skip が現実解の場合あり、 別途運用)。
UNCONDITIONAL_SKIP=$(
  grep -rnE 'test\.(skip|fixme)\s*\(\s*true\s*[,)]' tests/e2e/ 2>/dev/null || true
)
if [ -n "$UNCONDITIONAL_SKIP" ]; then
  # allowlist 行 (test 固有事情で意図的に skip): 行末に `// audit-no-test-hook-leak:ok` で許容
  UNEXPECTED=$(echo "$UNCONDITIONAL_SKIP" | grep -v 'audit-no-test-hook-leak:ok' || true)
  if [ -n "$UNEXPECTED" ]; then
    echo "ERROR: tests/e2e/ で unconditional test.skip / test.fixme が検出されました:"
    echo "$UNEXPECTED" | sed 's/^/  /'
    echo "  → 「機械検出を空転させない」 原則違反。 stable な test に直して skip を解除してください"
    echo "  → 真に skip が必要な場合は 行末に '// audit-no-test-hook-leak:ok' を付けて理由 issue を作成"
    echo
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
fi

if [ "$VIOLATIONS" -gt 0 ]; then
  echo "audit-no-test-hook-leak: $VIOLATIONS violation(s)"
  exit 1
fi

echo "✓ audit-no-test-hook-leak: __arcagateTest__ leak / unconditional skip ともに 0 件"
