#!/usr/bin/env bash
# audit-background-spawn-console.sh
#
# 背景 (app 内部) サブプロセスの console window ちらつき対策を fail-closed gate する。
#
# 不変条件:
#   `launcher/mod.rs` 以外で `Command::new(...)` を直接呼ばない。 背景プロセスは必ず
#   `utils::process::background_command(...)` 経由で生成し、 Windows の `CREATE_NO_WINDOW`
#   を強制する。 これにより「console を裏で叩くのに非表示フラグを立て忘れる」 退行を構造的に防ぐ。
#
# 動機: user 報告 (2026-06) — プロジェクトモーダルの git 走査が走るたびに console window が
#   大量に出る。 git / icon(powershell) を background_command 化して解消したが、 将来また
#   生 Command::new の背景 spawn が足されると同じ不具合が再発する。 場当たり修正でなく
#   ガードで担保する。
#
# whitelist (生 Command::new を許す = この audit の対象外):
#   - launcher/mod.rs   : user が明示起動する CLI / script / terminal の唯一の集約点。
#                         console 可視が正のため background_command を使わない。
#   - utils/process.rs  : background_command factory 自体の定義 (内部で Command::new を呼ぶ)。
#
# 引用元:
#   memory/feedback_horizontal_application.md (横展開 sweep 原則)
#   関連: scripts/audit-launcher-spawn-leak.sh (PATHEXT / e2e seam 観点の姉妹 audit)
#
# 使い方: bash scripts/audit-background-spawn-console.sh [SCAN_ROOT]
#   SCAN_ROOT 省略時は src-tauri/src を走査 (CI / pre-commit)。 セルフテストは fixture dir を渡す。

set -euo pipefail

cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

SCAN_ROOT="${1:-src-tauri/src}"

# 生 Command::new( の出現を検出。
#   - 行頭が // / /// の comment 行は除外 (doc コメント内の例示)
#   - whitelist file (launcher/mod.rs / utils/process.rs) は除外
LEAKS=$(
  grep -rnE 'Command::new\(' "$SCAN_ROOT" \
    --include='*.rs' 2>/dev/null \
    | grep -vE '(^|/)launcher/mod\.rs:' \
    | grep -vE '(^|/)utils/process\.rs:' \
    | grep -vE ':[[:space:]]*//' \
    || true
)

if [ -n "$LEAKS" ]; then
  echo "ERROR: 背景プロセスが生 Command::new(...) で spawn されています (console 非表示フラグ漏れの恐れ):"
  echo "$LEAKS" | sed 's/^/  /'
  echo
  echo "  → utils::process::background_command(<program>) 経由に変更してください"
  echo "     (Windows で CREATE_NO_WINDOW を自動付与し console window のちらつきを防ぐ)"
  echo "  → user が明示起動する CLI / script は launcher/mod.rs 集約 (console 可視が正) のため対象外"
  echo
  echo "audit-background-spawn-console: 1 violation group"
  exit 1
fi

echo "✓ audit-background-spawn-console: 背景の生 Command::new 0 件 (全て background_command 経由)"
