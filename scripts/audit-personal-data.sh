#!/usr/bin/env bash
# audit-personal-data.sh
#
# 個人パス / 実 item 名 / 個人 email が **新規 commit** に紛れていないか fail-closed で検出。
#
# pattern source (どちらも 1 行 1 ERE regex、 `#` コメント / 空行は無視):
#   - scripts/personal-data-patterns.txt        (commit、 generic な構造 regex only)
#   - scripts/.personal-data-patterns.local.txt (gitignored、 user 個別 = 実 username /
#                                                実 workspace root / 実 brand / 実 email 等)
#
# pattern は **case-sensitive な POSIX ERE** として `grep -E -f` に渡される。
# committed 側は構造 pattern (`C:[\\/]Users[\\/][a-zA-Z0-9._-]+[\\/]` 等) のみで固有名詞を持たない。
# 固有名詞 (実 username / 実 brand / 実 email) は手元の local file で個別管理し、
# commit ファイルに `<username>` 等 placeholder を残す形に generic 化させて bypass する。
# (`grep -F -i -f` は GNU grep 3.0 + MINGW で SIGABRT する既知 bug があるが、
#  本 hook は `-E` + 大小区別ありで動作するため当該 bug 経路には乗らない)
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

PATTERN_FILES=(
  "scripts/personal-data-patterns.txt"
  "scripts/.personal-data-patterns.local.txt"
)

# 自己除外: pattern file 本体 / audit doc / 本 script / PR template は pattern を文中に
# 含む正当な場所なので scan 対象から外す。
SELF_EXCLUDE=(
  "scripts/personal-data-patterns.txt"
  "scripts/.personal-data-patterns.local.txt"
  "scripts/audit-personal-data.sh"
  "docs/l3_phases/audit/PERSONAL_DATA_LEAK_AUDIT_2026-05-20.md"
  ".github/pull_request_template.md"
)

# pattern を集約
patterns=()
for f in "${PATTERN_FILES[@]}"; do
  if [[ -f "$f" ]]; then
    while IFS= read -r line || [[ -n "$line" ]]; do
      # CRLF 対策
      line="${line%$'\r'}"
      [[ -z "${line// }" ]] && continue
      [[ "$line" =~ ^[[:space:]]*# ]] && continue
      patterns+=("$line")
    done < "$f"
  fi
done

if [[ ${#patterns[@]} -eq 0 ]]; then
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

# ERE regex OR 検索 (case-sensitive)
hits=$(printf '%s\n' "$added_lines" | grep -E -f <(printf '%s\n' "${patterns[@]}") || true)

if [[ -n "$hits" ]]; then
  echo "❌ personal-data leak detected in staged changes:" >&2
  echo "" >&2
  echo "$hits" >&2
  echo "" >&2
  echo "patterns are loaded from:" >&2
  for f in "${PATTERN_FILES[@]}"; do
    [[ -f "$f" ]] && echo "  - $f" >&2
  done
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
