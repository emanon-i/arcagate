#!/usr/bin/env bash
# audit-item-cascade-helper.sh (item-lifecycle contract)
#
# アイテムライフサイクル契約 (docs/l2_foundation/features/cross-cutting/item-lifecycle.md)
# の不変条件: 「item 行を削除する全経路は `delete_item_with_cleanup` 共通 helper を経由する」
# を機械検出する。
#
# チェック内容:
#   1. production code (`src-tauri/src/` 配下、 `#[cfg(test)]` block 除く) に
#      `DELETE FROM items` が helper / 例外 file 以外に書かれていないこと。
#   2. helper 関数 `delete_item_with_cleanup` 自体が存在し、
#      hide 記録 + cascade_remove + delete の 3 step を実装していること。
#
# 例外 (allowlist):
#   - `item_repository::delete` 内 (= helper の最終段の primitive)
#   - `reset_service::factory_reset` の bulk reset (= 全件消去、 helper でなく raw OK)
#   - test code (`#[cfg(test)]` または `tests/` 配下)
#
# 違反 1 件でも検出されたら non-zero exit。

set -euo pipefail

violations=0

echo "→ audit-item-cascade-helper: helper 存在チェック"

ITEM_SVC="src-tauri/src/services/item_service.rs"
if [[ ! -f "$ITEM_SVC" ]]; then
	echo "  ✗ $ITEM_SVC が見つからない"
	exit 1
fi

# helper シグネチャ + 3 step が揃っているか
if ! grep -q "pub fn delete_item_with_cleanup" "$ITEM_SVC"; then
	echo "  ✗ delete_item_with_cleanup 関数が item_service.rs に存在しない"
	violations=$((violations + 1))
else
	# 3 step 全部が helper 内で参照されているか粒度チェック
	helper_block=$(awk '
		/pub fn delete_item_with_cleanup/ { in_fn = 1; depth = 0 }
		in_fn {
			print
			for (i = 1; i <= length($0); i++) {
				ch = substr($0, i, 1)
				if (ch == "{") depth++
				if (ch == "}") {
					depth--
					if (depth == 0) { in_fn = 0; exit }
				}
			}
		}
	' "$ITEM_SVC")
	for required in "find_source_back_link" "widget_item_hides_repository::add" "cascade_remove_item_from_widgets" "item_repository::delete"; do
		if ! grep -q "$required" <<< "$helper_block"; then
			echo "  ✗ delete_item_with_cleanup が $required を含まない"
			violations=$((violations + 1))
		fi
	done
	if [[ $violations -eq 0 ]]; then
		echo "  ✓ delete_item_with_cleanup が 3 step (hide + cascade + delete) を完備"
	fi
fi

echo "→ audit-item-cascade-helper: 'DELETE FROM items' の caller を allowlist と照合"

# raw `DELETE FROM items` を持つ箇所を列挙 (#[cfg(test)] block 内は除外)
# awk で test block を文字列単位で剥がしてから grep するのが堅実。
mapfile -t hits < <(
	for f in $(find src-tauri/src -name '*.rs' -type f); do
		# test mod block を粗く剥がす (`#[cfg(test)]` 直後の `mod ... { ... }` 全体)。
		# 完璧ではないが production scope の確認には十分。
		stripped=$(awk '
			/#\[cfg\(test\)\]/ { skipping = 1; depth = 0; next }
			skipping {
				for (i = 1; i <= length($0); i++) {
					ch = substr($0, i, 1)
					if (ch == "{") depth++
					if (ch == "}") {
						depth--
						if (depth == 0) { skipping = 0; next }
					}
				}
				next
			}
			{ print }
		' "$f")
		# コメント行 (`//` または `///`) は除外。 raw SQL リテラル のみが対象。
		echo "$stripped" | grep -nE 'DELETE FROM items' | grep -vE ':[[:space:]]*//' | sed "s|^|${f}:|" || true
	done
)

# allowlist (絶対 path で記述)
allowlist=(
	"src-tauri/src/repositories/item_repository.rs"
	"src-tauri/src/services/reset_service.rs"
)

for hit in "${hits[@]}"; do
	file=${hit%%:*}
	allowed=0
	for a in "${allowlist[@]}"; do
		if [[ "$file" == "$a" ]]; then
			allowed=1
			break
		fi
	done
	if [[ $allowed -eq 0 ]]; then
		echo "  ✗ allowlist 外の 'DELETE FROM items': $hit"
		violations=$((violations + 1))
	fi
done

if [[ $violations -eq 0 ]]; then
	echo "✓ audit-item-cascade-helper: all callers go through delete_item_with_cleanup (or allowlisted bulk path)"
	exit 0
fi

echo "✗ audit-item-cascade-helper: $violations violation(s) — item-lifecycle 契約違反"
exit 1
</content>
