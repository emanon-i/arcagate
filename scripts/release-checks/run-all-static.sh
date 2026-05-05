#!/usr/bin/env bash
# run-all-static.sh
#
# release readiness 自動 check のうち **static (HW 非依存)** な項目をまとめて実行。
# CI で必須化、release tag push 前 gate として使う。
#
# - check-blocker-files.sh: CHANGELOG / SUPPORT / PRIVACY / LICENSE 存在
# - check-error-monitor.sh: B-2 frontend silent fail 検知 install 確認
# - check-pubkey.sh: B-1 updater pubkey PLACEHOLDER 検出 (deferred 期間中は WARN)
# - 既存 audit-* scripts 全件
#
# 動的 (HW 依存、起動 / メモリ計測) は run-all-runtime.sh で別途実行。

set -uo pipefail

cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

declare -i fail_count=0
declare -a failed_checks=()

run_check() {
	local label="$1"
	shift
	echo ""
	echo "==================================================="
	echo "  $label"
	echo "==================================================="
	if "$@"; then
		echo "  → PASS"
	else
		echo "  → FAIL ($label)"
		fail_count=$((fail_count + 1))
		failed_checks+=("$label")
	fi
}

# release blocker (R3 gap-list)
run_check "blocker files" bash scripts/release-checks/check-blocker-files.sh
run_check "error monitor (B-2)" bash scripts/release-checks/check-error-monitor.sh
run_check "updater pubkey (B-1, deferred allowed)" bash scripts/release-checks/check-pubkey.sh

# 既存 audit scripts (token / label / handle / hotkey 等)
run_check "design tokens" bash scripts/audit-design-tokens.sh
run_check "font hardcode" bash scripts/audit-font-hardcode.sh
run_check "text overflow" bash scripts/audit-text-overflow.sh
run_check "labels" bash scripts/audit-labels.sh
run_check "handle style" bash scripts/audit-handle-style.sh
run_check "widget shell" bash scripts/audit-widget-shell.sh
run_check "widget settings schema" bash scripts/audit-widget-settings-schema.sh

echo ""
echo "==================================================="
echo "  Static release-readiness summary"
echo "==================================================="
if [ "$fail_count" -eq 0 ]; then
	echo "  ✅ All static checks passed."
	exit 0
fi
echo "  ❌ $fail_count check(s) failed:"
for c in "${failed_checks[@]}"; do
	echo "    - $c"
done
exit 1
