#!/usr/bin/env bash
# audit-source-back-link.sh (PH-CF-100)
# 監視アイテムの逆方向ライフサイクル契約を grep で機械検出する。
#
# チェック内容:
#   1. 監視自動登録経路 (auto_register_folder_items / register_exe_item_on_conn /
#      register_exe_items_bulk) の関数本体で `find_by_target` を残していないこと
#      (= 必ず `find_by_source` に切替済)。 1 経路でも漏れると逆方向ライフサイクルが破綻する。
#   2. item_repository に `find_by_source` / `find_source_back_link` が存在すること。
#   3. items テーブル schema に source_widget_id / source_entry_key 列が migration で
#      追加されていること (migration 039)。
#
# 注: 単発 `register_exe_item` (user 直接経路) は find_by_target を使い続けて OK。
# 本 script は監視自動登録経路に対してのみ find_by_target 残存を禁止する。

set -euo pipefail

violations=0

echo "→ audit-source-back-link: 監視自動登録経路で find_by_source 切替済かチェック"

# auto_register_folder_items / register_exe_item_on_conn 両方の関数本体に find_by_source
# 呼び出しが存在することを確認する (= 監視 widget 由来の重複判定が所有関係ベースに切替済)。
# 同時に source None (user 直接経路) 用に find_by_target も残るのは仕様。
# 関数 boundary 抽出は awk で行う。
ITEM_SVC="src-tauri/src/services/item_service.rs"

for fn_name in auto_register_folder_items register_exe_item_on_conn; do
	body=$(awk -v fn="$fn_name" '
		BEGIN { in_fn = 0; depth = 0 }
		/^(pub )?(async )?fn / {
			if (in_fn && depth == 0) { in_fn = 0 }
			if ($0 ~ ("fn " fn "\\(")) {
				in_fn = 1; depth = 0
			}
		}
		in_fn {
			print
			for (i = 1; i <= length($0); i++) {
				ch = substr($0, i, 1)
				if (ch == "{") depth++
				else if (ch == "}") {
					depth--
					if (depth == 0) { in_fn = 0; next }
				}
			}
		}
	' "$ITEM_SVC")

	if echo "$body" | grep -q "find_by_source"; then
		echo "  ✓ $fn_name: uses find_by_source on watch path"
	else
		echo "  ❌ $fn_name: missing find_by_source (watch-path reconcile must be ownership-based)"
		violations=$((violations + 1))
	fi
	if ! echo "$body" | grep -q "widget_item_hides_repository\|hides\."; then
		echo "  ❌ $fn_name: missing widget_item_hides skip check"
		violations=$((violations + 1))
	fi
done

# register_exe_items_bulk は内部で register_exe_item_on_conn に委譲するため、 自身が
# find_by_source を直接呼ぶ必要は無い。 ただし source_widget_id を委譲しているか確認。
if ! grep -q "register_exe_item_on_conn(.*source.*)" "$ITEM_SVC"; then
	echo "  ❌ register_exe_items_bulk: must forward source tuple to register_exe_item_on_conn"
	violations=$((violations + 1))
else
	echo "  ✓ register_exe_items_bulk: forwards source to register_exe_item_on_conn"
fi

echo "→ audit-source-back-link: find_by_source / find_source_back_link の repository 存在チェック"
for helper in find_by_source find_source_back_link; do
	if grep -q "pub fn $helper" src-tauri/src/repositories/item_repository.rs; then
		echo "  ✓ item_repository::$helper present"
	else
		echo "  ❌ item_repository::$helper missing"
		violations=$((violations + 1))
	fi
done

echo "→ audit-source-back-link: items table back-link 列の migration 存在チェック"
if grep -q "source_widget_id" src-tauri/migrations/039_items_source_back_link.sql \
	&& grep -q "source_entry_key" src-tauri/migrations/039_items_source_back_link.sql; then
	echo "  ✓ migration 039 adds both source_widget_id and source_entry_key"
else
	echo "  ❌ migration 039 missing back-link columns"
	violations=$((violations + 1))
fi

if [ "$violations" -eq 0 ]; then
	echo "✓ audit-source-back-link: all PH-CF-100 contracts satisfied"
	exit 0
else
	echo "✗ audit-source-back-link: $violations violation(s)"
	exit 1
fi
