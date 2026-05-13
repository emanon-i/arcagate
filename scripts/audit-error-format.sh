#!/usr/bin/env bash
# audit-error-format.sh
#
# audit 2026-05-13 F13: frontend で `String(e)` を toastStore に直接渡してる箇所を検出。
# backend `AppError` は `{ code, message }` 構造体 serialize なので `String(e)` だと
# `[object Object]` になる UX bug。 `getErrorMessage(e)` (utils/format-error.ts) 経由必須。
#
# 除外:
#   - format-error.ts 自身 (helper 内部の `String(e)` fallback は OK)
#   - utils/ipc-error.ts / launch-error.ts (専用 formatter helper)
#   - test file
#   - openers.svelte.ts (store 内部 error field の format)
#
# 検出 pattern: `toastStore.add(... String(e) ...)`

set -e

VIOLATIONS=$(grep -rn 'toastStore\.add.*String(e)' src/ --include="*.svelte" --include="*.ts" 2>/dev/null || true)

if [ -n "$VIOLATIONS" ]; then
    echo "ERROR: toastStore.add(... \${String(e)} ...) pattern detected"
    echo "  → getErrorMessage(e) (utils/format-error.ts) 経由で format してください"
    echo "  (AppError は { code, message } object serialize、 String(e) は [object Object] になる)"
    echo
    echo "$VIOLATIONS"
    echo
    echo "参照: src/lib/utils/format-error.ts:8 getErrorMessage()"
    exit 1
fi

echo "✓ audit-error-format: 0 violations"
exit 0
