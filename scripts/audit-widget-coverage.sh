#!/usr/bin/env bash
# audit-widget-coverage.sh
#
# Rust enum (WidgetType) と TS registry の variant 集合一致を検証する。
# どちらかに entry が漏れていれば exit 1。
#
# 検出対象:
#   1. Rust WidgetType enum arms (src-tauri/src/models/workspace.rs)
#   2. TS auto-generated bindings (src/lib/bindings/WidgetType.ts)
#   3. workspace.widget_label.* keys in messages_ja.json (i18n 化済 = K-1)
#      旧 `WIDGET_LABELS: Record<WidgetType, string>` 静的 map は Proxy で
#      backward-compat、 source-of-truth は messages JSON に移行

set -euo pipefail

cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

# Rust 側 enum arms 抽出
# WidgetType enum 内の `Foo,` パターンを取り、PascalCase → snake_case に変換
rust_variants=$(awk '
	/pub enum WidgetType \{/ { in_enum = 1; next }
	in_enum && /^}/ { in_enum = 0 }
	in_enum && /^[[:space:]]+[A-Z][A-Za-z]+,?[[:space:]]*$/ {
		gsub(/[,[:space:]]/, "")
		# PascalCase → snake_case
		out = ""
		for (i = 1; i <= length($0); i++) {
			c = substr($0, i, 1)
			if (i > 1 && c ~ /[A-Z]/) out = out "_"
			out = out tolower(c)
		}
		print out
	}
' src-tauri/src/models/workspace.rs | sort -u)

# TS auto-gen bindings 抽出
ts_bindings_variants=$(grep -oE '"[a-z_]+"' src/lib/bindings/WidgetType.ts 2>/dev/null | tr -d '"' | sort -u)

# messages_ja.json の workspace.widget_label.* keys を抽出。
# K-1 (2026-05-15) で widget label は i18n 化、 source-of-truth は messages JSON。
i18n_labels_variants=$(awk '
	/"widget_label": \{/ { in_labels = 1; next }
	in_labels && /^[[:space:]]*\}/ { in_labels = 0 }
	in_labels && match($0, /"([a-z_]+)":/, m) {
		print m[1]
	}
' src/lib/i18n/messages_ja.json | sort -u)

errors=0

# Rust ↔ ts-rs bindings 一致確認
diff_rust_bindings=$(diff <(echo "$rust_variants") <(echo "$ts_bindings_variants") || true)
if [ -n "$diff_rust_bindings" ]; then
	echo "❌ Rust enum と ts-rs bindings の variant 集合が不一致:"
	echo "$diff_rust_bindings"
	errors=$((errors + 1))
fi

# Rust ↔ messages_ja.json widget_label 一致確認
diff_rust_i18n=$(diff <(echo "$rust_variants") <(echo "$i18n_labels_variants") || true)
if [ -n "$diff_rust_i18n" ]; then
	echo "❌ Rust enum と messages_ja.json workspace.widget_label.* の variant 集合が不一致:"
	echo "$diff_rust_i18n"
	errors=$((errors + 1))
fi

# messages_en.json も同じ keys を持つこと
i18n_en_variants=$(awk '
	/"widget_label": \{/ { in_labels = 1; next }
	in_labels && /^[[:space:]]*\}/ { in_labels = 0 }
	in_labels && match($0, /"([a-z_]+)":/, m) {
		print m[1]
	}
' src/lib/i18n/messages_en.json | sort -u)
diff_ja_en=$(diff <(echo "$i18n_labels_variants") <(echo "$i18n_en_variants") || true)
if [ -n "$diff_ja_en" ]; then
	echo "❌ messages_ja.json / messages_en.json の widget_label 集合が不一致:"
	echo "$diff_ja_en"
	errors=$((errors + 1))
fi

if [ "$errors" -eq 0 ]; then
	echo "✔️ widget coverage 完全一致（$(echo "$rust_variants" | wc -l) variants）"
	exit 0
else
	echo ""
	echo "💡 Rust enum を変更したら 'cargo test --lib export_bindings' で TS bindings を再生成してください"
	exit 1
fi
