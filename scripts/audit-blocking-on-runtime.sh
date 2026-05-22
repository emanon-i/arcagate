#!/usr/bin/env bash
# audit-blocking-on-runtime.sh
#
# PH-PQ-400 T6: 重い I/O は全部 background。
# `#[tauri::command]` の fn body 内で std::fs:: / std::process:: / Command::new を
# spawn_blocking の外で直接呼んでいる箇所を検出する。
#
# layered design (commands -> services -> repositories -> DB) では command が
# 直接 blocking I/O を行うべきでなく、 やむを得ず行う場合も必ず
# tauri::async_runtime::spawn_blocking 内 (worker thread) に逃がす。
# main / async-runtime thread を blocking I/O で塞ぐと UI freeze (#524) を招く。
#
# 判定 (heuristic):
#   command file 内で `fn cmd_*` を fn scope の区切りとし、 その fn 内で
#   spawn_blocking が出現する前に blocking I/O token が現れたら violation。
#   `use` 文 / コメント行は call でないため除外。 reviewed-OK な例外は
#   ALLOWLIST に "file:line" 形式で登録する。
#
# audit-async-commands.sh (sync/async ルール) と相補的: あちらは command の
# async 化を強制、 こちらは async でも blocking I/O を runtime thread に残さないこと。
#
# 参照: docs/l3_phases/paid-quality/PH-PQ-400_speed-budgets.md (T6)
#       docs/l3_phases/audit/WASTEFUL_PROCESSING_AUDIT_2026-05-19.md

set -e

CMD_DIR="src-tauri/src/commands"

if [ ! -d "$CMD_DIR" ]; then
    echo "✓ audit-blocking-on-runtime: $CMD_DIR なし、skip"
    exit 0
fi

# reviewed-OK な例外 (現状なし)。 "file:line" 形式で空白区切り。
ALLOWLIST=""

violations=$(
    for f in "$CMD_DIR"/*.rs; do
        [ -f "$f" ] || continue
        awk -v file="$f" '
            /[^A-Za-z0-9_]fn[ \t]+cmd_/ { in_fn=1; has_sb=0; next }
            in_fn && /spawn_blocking/ { has_sb=1 }
            in_fn && /std::fs::|std::process::|Command::new/ {
                if ($0 ~ /^[ \t]*\/\//) next
                if ($0 ~ /^[ \t]*use[ \t]/) next
                if (!has_sb) print file ":" NR ": " $0
            }
        ' "$f"
    done
)

# ALLOWLIST 済の "file:line" を除外。
if [ -n "$ALLOWLIST" ] && [ -n "$violations" ]; then
    filtered=""
    while IFS= read -r v; do
        [ -z "$v" ] && continue
        loc=$(echo "$v" | cut -d: -f1-2)
        skip=0
        for a in $ALLOWLIST; do
            [ "$a" = "$loc" ] && skip=1 && break
        done
        [ "$skip" -eq 0 ] && filtered="${filtered}${v}
"
    done <<EOF
$violations
EOF
    violations="$filtered"
fi

if [ -n "$violations" ]; then
    echo "ERROR: audit-blocking-on-runtime 違反"
    echo
    echo "$violations" | sed 's/^/  /'
    echo
    echo "command 内の blocking I/O (std::fs / std::process / Command::new) は"
    echo "tauri::async_runtime::spawn_blocking で worker thread に逃がすこと。"
    echo "reviewed-OK な例外は本 script の ALLOWLIST に file:line を追加。"
    echo "参照: docs/l3_phases/paid-quality/PH-PQ-400_speed-budgets.md (T6)"
    exit 1
fi

echo "✓ audit-blocking-on-runtime: 0 violations"
exit 0
