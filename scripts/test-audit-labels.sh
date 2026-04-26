#!/usr/bin/env bash
# scripts/test-audit-labels.sh
#
# audit-labels.sh セルフテスト。tmpdir に違反 / OK 両方の fixture を作って
# 期待した exit code が返ることを確認する。

set -euo pipefail

cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

tmpdir=$(mktemp -d -t arcagate-audit-labels-XXXXXX)
trap 'rm -rf "$tmpdir"' EXIT

pass_dir="$tmpdir/pass"
fail_dir="$tmpdir/fail"
mkdir -p "$pass_dir" "$fail_dir"

cat > "$pass_dir/Good.svelte" <<'EOF'
<button aria-label="お気に入りに追加">
	<Star class="h-4 w-4" />
</button>
EOF

cat > "$fail_dir/Bad.svelte" <<'EOF'
<button aria-label="Star">
	<Star class="h-4 w-4" />
</button>
EOF

# pass case
if bash scripts/audit-labels.sh "$pass_dir" >/dev/null 2>&1; then
	echo "✔️ pass case: audit が exit 0"
else
	echo "❌ pass case: audit が exit 0 を返さなかった"
	exit 1
fi

# fail case
if bash scripts/audit-labels.sh "$fail_dir" >/dev/null 2>&1; then
	echo "❌ fail case: audit が違反を検出できなかった (exit 0 を返した)"
	exit 1
else
	echo "✔️ fail case: audit が exit 1 で違反検出"
fi

echo "✔️ test-audit-labels.sh 全 pass"
