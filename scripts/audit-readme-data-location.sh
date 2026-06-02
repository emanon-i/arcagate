#!/usr/bin/env bash
# audit-readme-data-location.sh
#
# PH-CF-1300 (データ透明化): README.md にデータ保存先 section が存在することを
# 機械検出する。 user 透明性契約 (= 「Arcagate は以下のフォルダにデータを保存します」
# を README で見つけられる) を守るための fail-closed gate。
#
# 検出規則 (= 全て満たすこと):
#   1. `## データ保存場所` heading が存在する
#   2. その下に `%APPDATA%\com.arcagate.desktop\arcagate.db` への言及がある
#   3. その下に `%LOCALAPPDATA%\com.arcagate.desktop\logs` への言及がある
#   4. 旧 identifier (`%LOCALAPPDATA%\arcagate\logs`) の残骸がない (修正済確認)
#
# 1 つでも欠ければ exit 1。

set -euo pipefail

cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

README=README.md

if [[ ! -f "$README" ]]; then
  echo "audit-readme-data-location: $README not found" >&2
  exit 1
fi

violations=""

# 1. heading 存在
if ! grep -qE '^## データ保存場所' "$README"; then
  violations="${violations}  ✗ README に '## データ保存場所' heading が無い\n"
fi

# 2. DB path 言及
if ! grep -qF '%APPDATA%\com.arcagate.desktop\arcagate.db' "$README"; then
  violations="${violations}  ✗ README に %APPDATA%\\com.arcagate.desktop\\arcagate.db への言及が無い\n"
fi

# 3. log path 言及 (新 identifier)
if ! grep -qE '%LOCALAPPDATA%\\com\.arcagate\.desktop\\logs' "$README"; then
  violations="${violations}  ✗ README に %LOCALAPPDATA%\\com.arcagate.desktop\\logs への言及が無い\n"
fi

# 4. 旧 identifier 残骸チェック (= bundle identifier 揃え)
# `%LOCALAPPDATA%\arcagate\` (com. なし) は古い記述、 撤去要
if grep -qE '%LOCALAPPDATA%\\arcagate\\' "$README"; then
  violations="${violations}  ✗ README に旧 log path '%LOCALAPPDATA%\\arcagate\\' 残骸あり (com.arcagate.desktop に修正要)\n"
fi

if [[ -n "$violations" ]]; then
  echo "ERROR: audit-readme-data-location 違反 (PH-CF-1300)" >&2
  printf "%b" "$violations" >&2
  echo "" >&2
  echo "詳細: docs/l3_phases/clean-feedback/PH-CF-1300_data-transparency.md" >&2
  exit 1
fi

echo "✓ audit-readme-data-location: README データ保存場所 section OK"
