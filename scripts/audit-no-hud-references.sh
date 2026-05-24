#!/usr/bin/env bash
# audit-no-hud-references.sh
#
# PH-CF-800 F1 機械検出: HUD は user 判断 (2026-05-23) で builtin から削除済 (migration 041)。
# `hud` 文字列 / `HUD` 識別子が theme 関連の active source に再混入していないことを grep gate する。
#
# 引用元 guideline:
#   docs/l3_phases/clean-feedback/PH-CF-800_theme-settings-polish.md §F1 受け入れ条件
#   docs/l2_foundation/features/screens/settings.md §builtin テーマ構成契約

set -euo pipefail

cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

# 検査対象 (active source / 設定 / i18n / CSS / theme 関連 Rust / e2e)。
# scope を絞ることで「過去 migration / archive / lessons」 への hud 言及は誤検出しない。
TARGETS=(
  "src/lib/styles/arcagate-theme.css"
  "src/lib/components/settings/SettingsAppearancePane.svelte"
  "src/lib/utils/color.ts"
  "src/lib/types/theme.ts"
  "src/lib/state/theme.svelte.ts"
  "src/lib/i18n/messages_ja.json"
  "src/lib/i18n/messages_en.json"
  "src-tauri/src/services/theme_service.rs"
  "src-tauri/src/repositories/theme_repository.rs"
  "src-tauri/src/commands/theme_commands.rs"
  "tests/e2e/library-perf.spec.ts"
)

# `hud` / `HUD` 全行を抽出 (case-insensitive)。 `[data-theme='hud']` / `theme_hud` 等の
# 残骸を一律検出する。 文字列 `huddle` 等の false-positive を避けるため境界付き正規表現で。
# 削除を verify する目的の assertion / 過去経緯コメント等は **行末マーカー**
# `audit-no-hud-references:ok` で個別 allowlist する (採用テストや経緯コメントが行毎に文脈を
# 持つため、 grep -v でファイル単位 skip するより安全)。
VIOLATIONS=0
for f in "${TARGETS[@]}"; do
  if [ ! -f "$f" ]; then
    continue
  fi
  # 文字単位の境界 `\b` (POSIX ERE) で hud をマッチ。
  hits=$(grep -nEi '\bhud\b' "$f" 2>/dev/null || true)
  if [ -z "$hits" ]; then
    continue
  fi
  # allowlist:
  #   (a) コメント / doc 行で「PH-CF-800」 / 「migration 041」 / 「削除」 / 「removed」 を含む
  #       (削除経緯を doc 化した historical comment)
  #   (b) 直前行に audit-no-hud-references:ok があるもの (個別 verify assertion)
  unexpected=$(awk -v file="$f" '
    /audit-no-hud-references:ok/ { allow_next = 1; next }
    {
      if (tolower($0) ~ /\<hud\>/) {
        if (allow_next || $0 ~ /audit-no-hud-references:ok/) {
          allow_next = 0
          next
        }
        # コメント行 (// , /* , * , # で始まる) で historical marker を含むなら allow
        if ($0 ~ /^[[:space:]]*(\/\/|\/\*|\*|#|--)/ &&
            $0 ~ /(PH-CF-800|migration 041|削除|removed)/) {
          allow_next = 0
          next
        }
        print FILENAME ":" NR ": " $0
      }
      allow_next = 0
    }
  ' "$f")
  if [ -n "$unexpected" ]; then
    echo "ERROR: HUD references found in $f (PH-CF-800 F1 で削除済)"
    echo "$unexpected"
    echo
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
done

if [ "$VIOLATIONS" -gt 0 ]; then
  echo "audit-no-hud-references: $VIOLATIONS file(s) with unexpected HUD references"
  exit 1
fi

echo "✓ audit-no-hud-references: no HUD strings in theme active sources (PH-CF-800 F1 契約 OK)"
