#!/usr/bin/env bash
# audit-personal-data.sh
#
# 個人パス / 実 item 名 / 個人 email が **新規 commit** に紛れていないか fail-closed で検出。
#
# pattern source (2 系統):
#   - scripts/personal-data-patterns.txt        (commit、 **regex** = grep -E)
#       generic 構造マッチ (例: [Cc]:[\\/]Users[\\/]... / [\\/]secrets?[\\/])。
#       固有名詞 (実 username / workspace 名 / brand 名) は書かない。
#   - scripts/.personal-data-patterns.local.txt (gitignored、 **固定文字列** = grep -F)
#       手元の実 username / brand / 実 item 名 / 実 email など固有値を列挙。
#
# 設計判断 — 二系統に分けた理由 (2026-05-21):
#   single-tier (固定文字列のみ) では committed pattern file 自身に実 username
#   等を書くしかなく、 検出 dictionary が一次 leak source になっていた。 regex を
#   committed 側に逃がし、 固有名詞は手元の .local 側にだけ置く構成にすることで
#   公開 repo 内の dictionary に個人情報が一切残らない。 local 側を固定文字列
#   (grep -F) にした理由: 実 brand 名 / 実 email / 実機構成等は regex 化困難で、
#   user が思いついた literal をそのまま追加できる UX が現実的。
#
# pattern は **case-sensitive** で処理される。
# (`grep -F -i -f` は GNU grep 3.0 + MINGW で SIGABRT する既知 bug があるが、
#  本 hook は大小区別ありで動作するため当該 bug 経路には乗らない)
#
# 設計判断 — diff-based check (= 新規追加 line のみ grep):
#   既存 commit の leak (CLAUDE.md / archive 等) を毎 commit で再 fail させると lefthook が
#   永久に通らなくなる。 本 hook は「新規漏れ防止」 のみを責務にし、 既存 leak は別途
#   docs/l3_phases/audit/PERSONAL_DATA_LEAK_AUDIT_2026-05-20.md で別ライフサイクル管理。
#
# 起動方式:
#   - lefthook pre-commit から `{staged_files}` 引数付きで呼ばれる
#   - 引数なしの場合は `git diff --cached --name-only` で staged を自前取得 (pnpm audit:all 用)

set -euo pipefail

cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

REGEX_PATTERN_FILE="scripts/personal-data-patterns.txt"
FIXED_PATTERN_FILE="scripts/.personal-data-patterns.local.txt"

# 自己除外: pattern file 本体 / audit doc / 本 script / PR template は pattern を文中に
# 含む正当な場所なので scan 対象から外す。
SELF_EXCLUDE=(
  "scripts/personal-data-patterns.txt"
  "scripts/.personal-data-patterns.local.txt"
  "scripts/audit-personal-data.sh"
  "docs/l3_phases/audit/PERSONAL_DATA_LEAK_AUDIT_2026-05-20.md"
  ".github/pull_request_template.md"
)

read_patterns() {
  local file="$1"
  local -n out_arr="$2"
  if [[ ! -f "$file" ]]; then
    return 0
  fi
  while IFS= read -r line || [[ -n "$line" ]]; do
    # CRLF 対策
    line="${line%$'\r'}"
    [[ -z "${line// }" ]] && continue
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    out_arr+=("$line")
  done < "$file"
}

regex_patterns=()
fixed_patterns=()
read_patterns "$REGEX_PATTERN_FILE" regex_patterns
read_patterns "$FIXED_PATTERN_FILE" fixed_patterns

if [[ ${#regex_patterns[@]} -eq 0 && ${#fixed_patterns[@]} -eq 0 ]]; then
  echo "✓ audit-personal-data: pattern なし、 skip"
  exit 0
fi

# staged file 取得
if [[ $# -gt 0 ]]; then
  staged=("$@")
else
  mapfile -t staged < <(git diff --cached --name-only --diff-filter=ACMR 2>/dev/null || true)
fi

# 自己除外 + 実在 file のみに絞る
targets=()
for f in "${staged[@]:-}"; do
  [[ -z "$f" ]] && continue
  # path separator は forward-slash 統一 (Windows git bash)
  norm="${f//\\//}"
  skip=0
  for e in "${SELF_EXCLUDE[@]}"; do
    if [[ "$norm" == "$e" ]]; then skip=1; break; fi
  done
  [[ $skip -eq 1 ]] && continue
  [[ -f "$f" ]] && targets+=("$f")
done

if [[ ${#targets[@]} -eq 0 ]]; then
  echo "✓ audit-personal-data: scan 対象なし"
  exit 0
fi

# 新規追加 line のみ抽出 (path: 内容 形式)
added_lines=$(git diff --cached --no-color --unified=0 -- "${targets[@]}" 2>/dev/null \
  | awk '
    /^diff --git/ {
      # "diff --git a/foo b/foo" → "foo"
      sub("^.*[[:space:]]b/", "")
      file=$0
      next
    }
    /^\+\+\+ / { next }
    /^---/ { next }
    /^@@/ { next }
    /^\+[^+]/ {
      sub(/^\+/, "")
      print file ": " $0
    }
  ' || true)

if [[ -z "$added_lines" ]]; then
  echo "✓ audit-personal-data: 新規追加 line なし"
  exit 0
fi

# regex 系 (committed) + 固定文字列系 (local) の両方を検査して結合
all_hits=""
if [[ ${#regex_patterns[@]} -gt 0 ]]; then
  regex_hits=$(printf '%s\n' "$added_lines" | grep -E -f <(printf '%s\n' "${regex_patterns[@]}") || true)
  if [[ -n "$regex_hits" ]]; then
    all_hits+="$regex_hits"$'\n'
  fi
fi
if [[ ${#fixed_patterns[@]} -gt 0 ]]; then
  fixed_hits=$(printf '%s\n' "$added_lines" | grep -F -f <(printf '%s\n' "${fixed_patterns[@]}") || true)
  if [[ -n "$fixed_hits" ]]; then
    all_hits+="$fixed_hits"$'\n'
  fi
fi

# 末尾の空行を trim
all_hits="${all_hits%$'\n'}"

if [[ -n "$all_hits" ]]; then
  echo "❌ personal-data leak detected in staged changes:" >&2
  echo "" >&2
  echo "$all_hits" >&2
  echo "" >&2
  echo "patterns are loaded from:" >&2
  [[ -f "$REGEX_PATTERN_FILE" ]] && echo "  - $REGEX_PATTERN_FILE (regex / committed)" >&2
  [[ -f "$FIXED_PATTERN_FILE" ]] && echo "  - $FIXED_PATTERN_FILE (fixed / gitignored)" >&2
  echo "" >&2
  echo "対処:" >&2
  echo "  1) 該当 line を generic placeholder に書き換える" >&2
  echo "     (\$USERPROFILE / <repo-root> / 「低速 disk」 等)" >&2
  echo "  2) 意図的に commit する場合は file を SELF_EXCLUDE に追加" >&2
  echo "     (scripts/audit-personal-data.sh の SELF_EXCLUDE 配列)" >&2
  exit 1
fi

echo "✓ audit-personal-data: clean"
exit 0
