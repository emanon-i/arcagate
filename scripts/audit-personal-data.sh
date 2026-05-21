#!/usr/bin/env bash
# audit-personal-data.sh
#
# 個人パス / 実 item 名 / 個人 email が **新規 commit** に紛れていないか fail-closed で検出。
#
# pattern source (2 系統):
#   - scripts/personal-data-patterns.txt        (commit、 generic な構造 regex、 grep -P 評価)
#     固有名詞 (実 user 名 / 実 workspace 名 / 実 brand 名) は書かない。
#     書くと patterns 自身が GitHub に乗ってしまう。
#   - scripts/.personal-data-patterns.local.txt (gitignored、 固定文字列、 grep -F 評価)
#     user 個別の brand / 実 item 名 / 実 user 名 / 実 workspace 名 / 実鍵 path 等の具体値はこちら。
#
# どちらも 1 行 1 pattern、 `#` コメント / 空行は無視。
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
LITERAL_PATTERN_FILE="scripts/.personal-data-patterns.local.txt"

# 自己除外: pattern file 本体 / audit doc / 本 script / PR template は pattern を文中に
# 含む正当な場所なので scan 対象から外す。
SELF_EXCLUDE=(
  "scripts/personal-data-patterns.txt"
  "scripts/.personal-data-patterns.local.txt"
  "scripts/audit-personal-data.sh"
  "docs/l3_phases/audit/PERSONAL_DATA_LEAK_AUDIT_2026-05-20.md"
  ".github/pull_request_template.md"
)

# pattern 読み込み helper (CRLF 除去 + コメント / 空行 skip)
load_patterns() {
  local file="$1"
  [[ -f "$file" ]] || return 0
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%$'\r'}"
    [[ -z "${line// }" ]] && continue
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    printf '%s\n' "$line"
  done < "$file"
}

regex_patterns=()
while IFS= read -r p; do
  [[ -n "$p" ]] && regex_patterns+=("$p")
done < <(load_patterns "$REGEX_PATTERN_FILE")

literal_patterns=()
while IFS= read -r p; do
  [[ -n "$p" ]] && literal_patterns+=("$p")
done < <(load_patterns "$LITERAL_PATTERN_FILE")

if [[ ${#regex_patterns[@]} -eq 0 && ${#literal_patterns[@]} -eq 0 ]]; then
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

# 検査: regex (committed) と literal (local) を別々に評価して hit を集約
all_hits=""

if [[ ${#regex_patterns[@]} -gt 0 ]]; then
  # GNU grep 3.0 (MSYS / Git Bash) の `-P -f` は「-P only supports a single pattern」 で fail する。
  # 各 line を `(?:..)` で囲って `|` で alternation した 1 本の PCRE に合成して回避。
  # PCRE は LC_ALL=C.UTF-8 を明示しないと「supports only unibyte and UTF-8 locales」 で fail する環境がある。
  combined_regex=""
  for p in "${regex_patterns[@]}"; do
    [[ -n "$combined_regex" ]] && combined_regex+="|"
    combined_regex+="(?:$p)"
  done
  regex_hits=$(printf '%s\n' "$added_lines" \
    | LC_ALL=C.UTF-8 grep -P "$combined_regex" || true)
  if [[ -n "$regex_hits" ]]; then
    all_hits+="[regex pattern (committed)]"$'\n'"$regex_hits"$'\n'
  fi
fi

if [[ ${#literal_patterns[@]} -gt 0 ]]; then
  literal_hits=$(printf '%s\n' "$added_lines" \
    | grep -F -f <(printf '%s\n' "${literal_patterns[@]}") || true)
  if [[ -n "$literal_hits" ]]; then
    all_hits+="[literal pattern (local)]"$'\n'"$literal_hits"$'\n'
  fi
fi

if [[ -n "$all_hits" ]]; then
  echo "❌ personal-data leak detected in staged changes:" >&2
  echo "" >&2
  echo "$all_hits" >&2
  echo "" >&2
  echo "patterns are loaded from:" >&2
  [[ -f "$REGEX_PATTERN_FILE" ]]   && echo "  - $REGEX_PATTERN_FILE (regex, committed)" >&2
  [[ -f "$LITERAL_PATTERN_FILE" ]] && echo "  - $LITERAL_PATTERN_FILE (literal, local)" >&2
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
