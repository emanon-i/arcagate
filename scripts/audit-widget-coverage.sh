#!/usr/bin/env bash
# audit-widget-coverage.sh
#
# Rust enum (WidgetType) と TS registry の variant 集合一致を検証する。
# どちらかに entry が漏れていれば exit 1。
#
# 検出対象:
#   1. Rust WidgetType enum arms (src-tauri/src/models/workspace.rs)
#   2. TS auto-generated bindings (src/lib/bindings/WidgetType.ts)
#   3. WIDGET_LABELS Record (src/lib/types/workspace.ts) — 全 variant 網羅必須

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

# WIDGET_LABELS keys 抽出（key:value 行から key 部分だけ取り出す）
ts_labels_variants=$(awk '
	/WIDGET_LABELS: Record<WidgetType, string> = {/ { in_labels = 1; next }
	in_labels && /^};/ { in_labels = 0 }
	in_labels && match($0, /^[[:space:]]+([a-z_]+):/, m) {
		print m[1]
	}
' src/lib/types/workspace.ts | sort -u)

errors=0

# Rust ↔ ts-rs bindings 一致確認
diff_rust_bindings=$(diff <(echo "$rust_variants") <(echo "$ts_bindings_variants") || true)
if [ -n "$diff_rust_bindings" ]; then
	echo "❌ Rust enum と ts-rs bindings の variant 集合が不一致:"
	echo "$diff_rust_bindings"
	errors=$((errors + 1))
fi

# Rust ↔ WIDGET_LABELS 一致確認
diff_rust_labels=$(diff <(echo "$rust_variants") <(echo "$ts_labels_variants") || true)
if [ -n "$diff_rust_labels" ]; then
	echo "❌ Rust enum と WIDGET_LABELS の variant 集合が不一致:"
	echo "$diff_rust_labels"
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
