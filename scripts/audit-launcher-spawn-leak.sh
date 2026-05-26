#!/usr/bin/env bash
# audit-launcher-spawn-leak.sh
#
# SPAWN_HORIZONTAL_PATHEXT_SEAM_2026-05-26 audit §6:
#   (a) `Command::new(<可変 program>)` を `launcher/mod.rs` 以外で呼んでいない
#       (= PATHEXT 解決が `launcher::resolved_command` 経由に集約されている)
#   (b) `.spawn()` 直呼びを `launcher/mod.rs` 以外で行っていない
#       (= 全 external process spawn が `launcher::try_spawn_cmd` の e2e seam を通る)
#
# 動機: PR #579 (`launch_argv`) で `resolve_program_with_pathext` を導入したが、
# `launch_exe` / `launch_exe_args` / `launch_command` / `script_runner::run_script` /
# `cmd_reveal_in_explorer` は同じ `code.cmd` shim 問題 (Rust std が PATHEXT を自動 search
# しない) に晒されたままだった。 共通化 + 機械検出 audit で fail-closed gate する。
#
# allowlist: 固定 system command の literal `Command::new("name")` のみ除外。 これらは
# Windows System32 (`cmd.exe` / `powershell.exe`) や Git install dir (`git.exe`) に native
# `.exe` で実在し、 PATHEXT 漏れ問題は発生しない。 変数を渡す場合は allowlist を抜ける。
#
# 引用元 guideline:
#   docs/l3_phases/audit/SPAWN_HORIZONTAL_PATHEXT_SEAM_2026-05-26.md §6
#   memory/feedback_horizontal_application.md (2026-05-13 横展開 sweep 原則)

set -euo pipefail

cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

VIOLATIONS=0

# (a) Command::new(<X>) の出現を src-tauri/src 配下 (launcher を除く) で検出。
#     固定 system command の literal は除外: "cmd" / "powershell" / "explorer.exe" / "git" / "pwsh"。
#     変数を渡す `Command::new(&prog)` / `Command::new(target)` 等は allowlist を抜けて fail。
ALLOWED_RE='Command::new\("(cmd|powershell|explorer\.exe|git|pwsh)"\)'

# `grep -vE '^\s*//'` で行頭が `//` / `///` の doc / line comment を除外する
# (audit doc コメント内に "Command::new(...)" が現れる例: 比較説明)。
CMD_LEAKS=$(
  grep -rnE 'Command::new\(' src-tauri/src \
    --include='*.rs' 2>/dev/null \
    | grep -v '^src-tauri/src/launcher/mod\.rs:' \
    | grep -vE ':[[:space:]]*//' \
    | grep -vE "$ALLOWED_RE" \
    || true
)

if [ -n "$CMD_LEAKS" ]; then
  echo "ERROR: launcher/mod.rs 外で Command::new(<可変 program>) が直接呼ばれています:"
  echo "$CMD_LEAKS" | sed 's/^/  /'
  echo
  echo "  → launcher::resolved_command(program) + launcher::try_spawn_cmd(&mut cmd, what) 経由に集約してください"
  echo "  → 固定 system command (cmd / powershell / explorer.exe / git / pwsh) のみ allowlist で除外可"
  echo
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# (b) .spawn() 直呼びを launcher/mod.rs 以外で禁止 (e2e seam blind spot 防止)。
#     std::thread::spawn / tauri::async_runtime::spawn_blocking 等は引数を取るため
#     `.spawn()` (引数なし method call) には match しない。
SPAWN_LEAKS=$(
  grep -rnE '\.spawn\(\)' src-tauri/src \
    --include='*.rs' 2>/dev/null \
    | grep -v '^src-tauri/src/launcher/mod\.rs:' \
    | grep -vE ':[[:space:]]*//' \
    || true
)

if [ -n "$SPAWN_LEAKS" ]; then
  echo "ERROR: launcher/mod.rs 外で .spawn() が直接呼ばれています (e2e seam を通らない):"
  echo "$SPAWN_LEAKS" | sed 's/^/  /'
  echo
  echo "  → launcher::try_spawn_cmd(&mut cmd, what) 経由に集約してください"
  echo "  → cascade verify e2e の blind spot を防ぐため、 全 external process spawn は seam を通す"
  echo
  VIOLATIONS=$((VIOLATIONS + 1))
fi

if [ "$VIOLATIONS" -gt 0 ]; then
  echo "audit-launcher-spawn-leak: $VIOLATIONS violation(s)"
  exit 1
fi

echo "✓ audit-launcher-spawn-leak: launcher/mod.rs 外の spawn 直呼び / Command::new(<variable>) 0 件"
