#!/usr/bin/env bash
# scripts/test-audit-background-spawn-console.sh
#
# audit-background-spawn-console.sh セルフテスト。tmpdir に「違反 = 生 Command::new」と
# 「OK = background_command 経由」両方の fixture を作り、 期待 exit code を確認する。

set -euo pipefail

cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

tmpdir=$(mktemp -d -t arcagate-audit-bgspawn-XXXXXX)
trap 'rm -rf "$tmpdir"' EXIT

pass_dir="$tmpdir/pass"
fail_dir="$tmpdir/fail"
mkdir -p "$pass_dir" "$fail_dir"

# OK: background_command 経由 (生 Command::new を使わない)
cat > "$pass_dir/good.rs" <<'EOF'
fn run() {
    let mut c = crate::utils::process::background_command("git");
    let _ = c.arg("status").output();
}
EOF

# 違反: 背景 module で生 Command::new を直接使用
cat > "$fail_dir/bad.rs" <<'EOF'
fn run() {
    let mut c = std::process::Command::new("powershell");
    let _ = c.arg("-Command").output();
}
EOF

rc=0

# pass case (exit 0 を期待)
if bash scripts/audit-background-spawn-console.sh "$pass_dir" >/dev/null 2>&1; then
  echo "✔️ pass case: background_command のみ → exit 0"
else
  echo "❌ pass case: 誤検出 (exit 非0)"
  rc=1
fi

# fail case (exit 非0 を期待)
if bash scripts/audit-background-spawn-console.sh "$fail_dir" >/dev/null 2>&1; then
  echo "❌ fail case: 生 Command::new を検出できなかった (exit 0)"
  rc=1
else
  echo "✔️ fail case: 生 Command::new を検出 → exit 非0"
fi

# whitelist 除外の確認: launcher/mod.rs / utils/process.rs 配下は違反でも除外される
wl_dir="$tmpdir/wl/launcher"
mkdir -p "$wl_dir"
cat > "$wl_dir/mod.rs" <<'EOF'
fn run() {
    let _ = std::process::Command::new("cmd").spawn();
}
EOF
if bash scripts/audit-background-spawn-console.sh "$tmpdir/wl" >/dev/null 2>&1; then
  echo "✔️ whitelist case: launcher/mod.rs の Command::new は除外 → exit 0"
else
  echo "❌ whitelist case: launcher/mod.rs を誤検出 (exit 非0)"
  rc=1
fi

if [ "$rc" -eq 0 ]; then
  echo "✓ test-audit-background-spawn-console: 全 case PASS"
else
  echo "✗ test-audit-background-spawn-console: FAIL"
fi
exit "$rc"
