#!/usr/bin/env bash
# check-error-monitor.sh
#
# Frontend silent fail 検知 (R4-A B-2) が install されていることを検証。
# +layout.svelte で installErrorMonitor が呼ばれていなければ FAIL。

set -euo pipefail

cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

LAYOUT=src/routes/+layout.svelte
MONITOR=src/lib/state/error-monitor.svelte.ts

violations=0

if [ ! -f "$MONITOR" ]; then
	echo "FAIL: $MONITOR MISSING"
	violations=$((violations + 1))
fi

if [ ! -f "$LAYOUT" ]; then
	echo "FAIL: $LAYOUT MISSING"
	violations=$((violations + 1))
else
	if ! grep -q "installErrorMonitor" "$LAYOUT"; then
		echo "FAIL: $LAYOUT does not call installErrorMonitor (B-2 silent fail risk)"
		violations=$((violations + 1))
	else
		echo "OK: $LAYOUT installs error monitor"
	fi
fi

# unhandledrejection / window error 監視が source code に存在
if ! grep -q "unhandledrejection" "$MONITOR" 2>/dev/null; then
	echo "FAIL: error-monitor does not listen to 'unhandledrejection'"
	violations=$((violations + 1))
fi

if [ "$violations" -gt 0 ]; then
	echo ""
	echo "ERROR: $violations error-monitor check(s) failed."
	exit 1
fi
echo ""
echo "Frontend error monitor (B-2) installed correctly."
