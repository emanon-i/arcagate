#!/usr/bin/env bash
# audit-builtin-theme-css-vars.sh
#
# F3 根治 (migration 043) 機械検出: 6 builtin theme の `themes.css_vars` が空 '{}' から
# 実値 JSON に seed されていることを fail-closed gate。
#
# 動機:
#   audit `docs/l3_phases/audit/THEME_CLONE_AESTHETIC_LOST_2026-05-26.md` §推奨 A 案の
#   根治。 builtin の css_vars が空 '{}' のままだと cloneTheme(sourceId) で空 cssVars が
#   新 custom に伝播し、 `[data-theme='<uuid>']` block が CSS に無いため aesthetic が
#   default Dark / Light に化ける (brutalist-dark を copy したら default Dark になる)。
#
# 検出方針:
#   migration 043 (builtin_theme_css_vars_seed.sql) を grep し、 各 builtin ID
#   ('dark' / 'light' / 'brutalist' / 'brutalist-dark' / 'neumorph' / 'neumorph-dark')
#   が UPDATE 文を持ち、 主要 token (--c-bg / --c-fg / --c-primary / --surface-blur /
#   --ag-radius-lg) が JSON 内に含まれていることを行ベースで verify。
#
#   主要 token が揃っていれば「clone した custom theme でも source の aesthetic が
#   再現する」 条件 (audit doc §1 で実測 mismatch していた token を網羅) が満たされる。
#
# 引用元 guideline:
#   - docs/l3_phases/audit/THEME_CLONE_AESTHETIC_LOST_2026-05-26.md §推奨
#   - CLAUDE.md <critical-rule id="lateral-sweep"> (横展開 audit)

set -euo pipefail

cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

MIG="src-tauri/migrations/043_builtin_theme_css_vars_seed.sql"
if [ ! -f "$MIG" ]; then
  echo "ERROR: migration 043 (builtin_theme_css_vars_seed.sql) が見つかりません: $MIG"
  echo "  → F3 根治 (builtin css_vars 実値化) の migration を作成してください"
  exit 1
fi

VIOLATIONS=0

# 1. 各 builtin ID の UPDATE 行が存在することを verify。
for id in dark light brutalist brutalist-dark neumorph neumorph-dark; do
  # `WHERE id = '<id>' AND is_builtin = 1` 形式で限定 UPDATE していることを check。
  # is_builtin = 1 述語を強制して、 ユーザー作成 custom (= UUID id) を不可逆書き換え
  # しないことを保証する。
  if ! grep -qE "WHERE id = '${id}' AND is_builtin = 1" "$MIG"; then
    echo "ERROR: $MIG: builtin '${id}' の UPDATE 文 (with is_builtin = 1 guard) が見つかりません"
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
done

# 2. 各 builtin が主要 token を JSON 内に含むことを verify。
# UPDATE 行 → WHERE 行 の範囲で grep し、 必須 token が出現するかを sed で抽出して check。
REQUIRED_TOKENS=(
  '--c-bg'
  '--c-fg'
  '--c-primary'
  '--surface-blur'
  '--ag-radius-lg'
)

for id in dark light brutalist brutalist-dark neumorph neumorph-dark; do
  # builtin 1 件分の UPDATE 文 (1 行に JSON が乗っている前提) を抽出。
  block=$(grep -B1 "WHERE id = '${id}' AND is_builtin = 1" "$MIG" | head -n1 || true)
  if [ -z "$block" ]; then
    echo "ERROR: $MIG: builtin '${id}' の UPDATE 行が抽出できませんでした"
    VIOLATIONS=$((VIOLATIONS + 1))
    continue
  fi
  # css_vars = '{...}' が空 '{}' でないこと。
  if echo "$block" | grep -qE "css_vars = '\{\}'"; then
    echo "ERROR: $MIG: builtin '${id}' の css_vars が空 '{}' のままです (F3 clone bug 残存)"
    VIOLATIONS=$((VIOLATIONS + 1))
    continue
  fi
  # 主要 token が JSON 内に含まれていること。
  for tok in "${REQUIRED_TOKENS[@]}"; do
    # JSON は double-quoted "--c-bg" の形式。 grep は固定文字列で十分。
    if ! echo "$block" | grep -qF "\"${tok}\""; then
      echo "ERROR: $MIG: builtin '${id}' の css_vars に必須 token ${tok} が含まれていません"
      echo "  → clone fidelity 要件: ${tok} は audit doc §1 で実測 mismatch していた token"
      VIOLATIONS=$((VIOLATIONS + 1))
    fi
  done
done

# 3. arcagate-theme.css の [data-theme='ID'] / .dark / :root block が依然として存在することを
# verify (defense-in-depth)。 SSOT 統合は brutalist 系の body::before pseudo-element rule の
# 都合で完全には行えないため、 DB seed と CSS block の 2 重定義を維持し、 機械検出で整合を gate。
CSS="src/lib/styles/arcagate-theme.css"
if [ ! -f "$CSS" ]; then
  echo "ERROR: arcagate-theme.css が見つかりません: $CSS"
  VIOLATIONS=$((VIOLATIONS + 1))
else
  for selector in "\\[data-theme='neumorph'\\]" "\\[data-theme='brutalist'\\]" \
                  "\\[data-theme='neumorph-dark'\\]" "\\[data-theme='brutalist-dark'\\]"; do
    if ! grep -qE "$selector" "$CSS"; then
      echo "ERROR: $CSS: ${selector} block が見つかりません (defense-in-depth として残置が必須)"
      VIOLATIONS=$((VIOLATIONS + 1))
    fi
  done
fi

if [ "$VIOLATIONS" -gt 0 ]; then
  echo "audit-builtin-theme-css-vars: $VIOLATIONS violation(s)"
  exit 1
fi

echo "✓ audit-builtin-theme-css-vars: 6 builtin の css_vars が実値 seed されており、 主要 token が揃っている"
