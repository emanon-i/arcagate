#!/usr/bin/env bash
# audit-no-test-hook-leak.sh
#
# PH-CF-600 LB-2 fix-up 機械検出:
#   (a) `__arcagateTest__` (e2e 専用 test hook) を product code (src/lib / src/routes /
#       src-tauri) から参照していないこと
#   (b) `tests/e2e/*.spec.ts` 内で **unconditional** な `test.skip(true, ...)` /
#       `test.fixme(true, ...)` が無いこと (= 「機械検出を空転させない」 原則)
#   (c) `tests/e2e/**/*.spec.ts` で UI 操作 (click / fill / press / dblclick / hover / dragTo
#       / selectOption / check / uncheck / tap / setInputFiles / focus / blur) を **1 度も
#       含まない** spec が無いこと (= IPC 直叩き合成経路だけで test seam を組まない、
#       audit `docs/l3_phases/audit/THEME_CLONE_AESTHETIC_LOST_2026-05-26.md` §3 で確認した
#       「TS-3 / TS-4 が UI ボタン click を踏まず tautology assertion で空転していた」 構造的
#       失敗の再発防止)。 やむを得ず backend 契約 verify のみで完結する spec は file 内に
#       `audit-ui-bypass:ok` marker + 理由 comment で allowlist できる。
#
# 動機: PH-CF-600 LB-2 が `test.skip` 同等の「test 削除 + コメント置換」 状態で merge され
# 回帰検出が空転していた。 同型の skip 漏れを再発させないため audit script で gate。
#
# 引用元 guideline:
#   docs/l3_phases/clean-feedback/PH-CF-600_library-bug-fixes.md §C2 受け入れ条件 (機械検出)
#   docs/l2_foundation/features/screens/library.md §hidden 表示契約 機械検出
#   docs/l3_phases/audit/THEME_CLONE_AESTHETIC_LOST_2026-05-26.md §推奨 (UI bypass detection)

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

# (b) unconditional `test.skip(true, ...)` / `test.fixme(true, ...)` および 静的形式
# `test.skip('title', fn)` / `test.fixme('title', fn)` の検出。
#   - `test.skip(true, …)`     : if-block 等の中で「条件成立時に常に skip」 する形式
#   - `test.skip('title', fn)` : test 定義そのものを常に skip する静的形式 (旧 regex で見逃し、
#                                WD-3 が長期残存していた reason、 2026-05-25 拡張)
# 条件付き (`test.skip(!cond, ...)` / `test.skip(cond, ...)`) は環境依存 skip として許容。
# `tests/e2e/` 配下のみ対象 (`tests/perf/` は環境差で skip が現実解の場合あり、 別途運用)。
# 第 1 引数が `true` リテラル または 文字列リテラル (`'` / `"` / バッククォート で開始) を検出。
UNCONDITIONAL_SKIP=$(
  grep -rnE "test\.(skip|fixme)\s*\(\s*(true\s*[,)]|['\"\`])" tests/e2e/ 2>/dev/null || true
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

# (c) tests/e2e/**/*.spec.ts で UI 操作を 1 度も含まない spec を検出。 PR #570 LB-2 /
# PR #566 TS-3 / TS-4 が「IPC 直叩き合成経路 + tautology assertion」 で空転していた
# 構造的失敗の再発防止 (audit THEME_CLONE_AESTHETIC_LOST_2026-05-26.md §3)。
# 検出 pattern: Playwright の代表的 UI op を網羅 (click / fill / press / dblclick / hover /
# dragTo / selectOption / check / uncheck / tap / setInputFiles / focus / blur)。
# allowlist marker: file 内に `audit-ui-bypass:ok` が含まれていれば許容 (理由は近傍 comment)。
UI_OP_PATTERN='\.(click|fill|press|dblclick|hover|dragTo|selectOption|check|uncheck|tap|setInputFiles|focus|blur)\('
SPEC_FILES=$(find tests/e2e -type f -name '*.spec.ts' 2>/dev/null || true)
UI_BYPASS_VIOLATIONS=""
for spec in $SPEC_FILES; do
  if ! grep -qE "$UI_OP_PATTERN" "$spec" 2>/dev/null; then
    if ! grep -q 'audit-ui-bypass:ok' "$spec" 2>/dev/null; then
      UI_BYPASS_VIOLATIONS="${UI_BYPASS_VIOLATIONS}${spec}"$'\n'
    fi
  fi
done
if [ -n "$UI_BYPASS_VIOLATIONS" ]; then
  echo "ERROR: tests/e2e/ で UI 操作 (click/fill/press/etc) を 1 度も含まない spec が検出されました:"
  # 末尾の空行を排除
  echo "$UI_BYPASS_VIOLATIONS" | sed '/^$/d' | sed 's/^/  /'
  echo "  → 実 UI 経路で test seam を構成してください (PR #576 LB-2 + PR #581 F3 の哲学)。"
  echo "  → やむを得ず backend 契約のみ verify する spec は 該当 file 内に"
  echo "    '// audit-ui-bypass:ok' marker + 理由 comment を追加して allowlist してください。"
  echo
  VIOLATIONS=$((VIOLATIONS + 1))
fi

if [ "$VIOLATIONS" -gt 0 ]; then
  echo "audit-no-test-hook-leak: $VIOLATIONS violation(s)"
  exit 1
fi

echo "✓ audit-no-test-hook-leak: __arcagateTest__ leak / unconditional skip / UI-bypass ともに 0 件"
