#!/usr/bin/env bash
# check-blocker-files.sh
#
# release blocker として doc 存在を強制する。
# - CHANGELOG.md (root)
# - PRIVACY.md (root)
# - LICENSE (root)
# - README.md に サポート 節 (バグ報告 / log 場所 / SmartScreen 警告 等の operational 情報)
#
# 2026-05-13 docs restructure correction: 旧 docs/support.md は削除、
# その content (バグ報告 / log file / SmartScreen / telemetry) は README.md の
# サポート 節に統合済 → support.md check は廃止、 README.md サポート 節の存在だけ enforce。
#
# CI で必須化 (どれかが MISSING なら exit 1)。

set -euo pipefail

cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

violations=0

check_file() {
	local path="$1"
	if [ ! -f "$path" ]; then
		echo "FAIL: $path is MISSING (release blocker)"
		violations=$((violations + 1))
	else
		echo "OK: $path"
	fi
}

check_file "CHANGELOG.md"
check_file "PRIVACY.md"
check_file "LICENSE"
check_file "README.md"

if ! grep -q "サポート" README.md 2>/dev/null; then
	echo "FAIL: README.md missing 'サポート' 節 (release blocker)"
	violations=$((violations + 1))
else
	echo "OK: README.md has サポート 節"
fi

if [ "$violations" -gt 0 ]; then
	echo ""
	echo "ERROR: $violations release blocker file(s) missing."
	exit 1
fi
echo ""
echo "All release blocker files present."
