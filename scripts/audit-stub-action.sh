#!/usr/bin/env bash
# audit-stub-action.sh
#
# PH-PQ-500 T6: 「半端 button / 動かない handler」 撲滅。
# UI に出ているのに実際は何もしないコントロールを機械検出する。
#
# 検出対象:
#   [frontend] *.svelte の event handler (onclick / onchange / oninput ...) で
#     - 空関数         on*={() => {}}        / on*={async () => {}}
#     - console のみ   on*={() => console.log(...)} 等
#     - TODO コメントのみ on*={() => { /* TODO */ }}
#   [backend] src-tauri/src/commands/*.rs の Tauri command stub
#     - todo!() / unimplemented!()
#     - Ok(Default::default())  ← 中身を実装せず空の値を返す stub
#
# paid product では「click したのに動かない」 が最大の信頼破壊要因 (PH-PQ-500)。
# reviewed-OK な例外は ALLOWLIST に "file:line" 形式で登録する。
#
# 参照: docs/l3_phases/paid-quality/PH-PQ-500_completeness-sweep.md (T6)

set -e

# reviewed-OK な例外 (現状なし)。 "file:line" 形式で空白区切り。
ALLOWLIST=""

violations=""

# --- frontend: 空 / console のみ / TODO のみ の event handler ---
if [ -d "src" ]; then
    fe=$(grep -rnE \
        "on[a-z]+=\{[[:space:]]*(async[[:space:]]*)?\(\)[[:space:]]*=>[[:space:]]*\{[[:space:]]*\}[[:space:]]*\}" \
        src --include=*.svelte 2>/dev/null || true)
    [ -n "$fe" ] && violations="${violations}${fe}
"

    fe_console=$(grep -rnE \
        "on[a-z]+=\{[^}]*=>[[:space:]]*console\.(log|debug|warn|error)\(" \
        src --include=*.svelte 2>/dev/null || true)
    [ -n "$fe_console" ] && violations="${violations}${fe_console}
"

    fe_todo=$(grep -rnE \
        "on[a-z]+=\{[[:space:]]*(async[[:space:]]*)?\(\)[[:space:]]*=>[[:space:]]*\{[[:space:]]*/[/*][[:space:]]*(TODO|FIXME|XXX)" \
        src --include=*.svelte 2>/dev/null || true)
    [ -n "$fe_todo" ] && violations="${violations}${fe_todo}
"
fi

# --- backend: command stub ---
CMD_DIR="src-tauri/src/commands"
if [ -d "$CMD_DIR" ]; then
    be=$(grep -rnE "todo!\(|unimplemented!\(|Ok\(Default::default\(\)\)" \
        "$CMD_DIR" 2>/dev/null || true)
    [ -n "$be" ] && violations="${violations}${be}
"
fi

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

# 空行除去後の判定
violations=$(echo "$violations" | grep -v '^[[:space:]]*$' || true)

if [ -n "$violations" ]; then
    echo "ERROR: audit-stub-action 違反 — 動かない handler / stub command を検出"
    echo
    echo "$violations" | sed 's/^/  /'
    echo
    echo "UI のコントロールは必ず実 action を持たせること (完成 / 削除 / 隠す)。"
    echo "空関数 / console のみ / TODO のみの handler、 Default を返すだけの command は"
    echo "paid product の信頼を損なう (PH-PQ-500)。"
    echo "reviewed-OK な例外は本 script の ALLOWLIST に file:line を追加。"
    exit 1
fi

echo "✓ audit-stub-action: 0 violations"
exit 0
