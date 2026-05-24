#!/usr/bin/env bash
# audit-library-sidebar-icons.sh
#
# PH-CF-700 C6 機械検出: `LibrarySidebar.svelte` で `LayoutDashboard` を使うのは
# workspace section の 1 箇所のみ (= workspace タグ行)。 タグ section や Type タグ section
# の fallback に workspace アイコンを使うと「タグなのに workspace アイコン」 という認知
# ミスマッチが再発する。
#
# 引用元 guideline:
#   docs/l2_foundation/features/screens/library.md §サイドバーアイコン契約 (PH-CF-700 C6)

set -euo pipefail

cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

TARGET='src/lib/components/arcagate/library/LibrarySidebar.svelte'

if [ ! -f "$TARGET" ]; then
  echo "ERROR: $TARGET not found (expected location)"
  exit 1
fi

# `LayoutDashboard` の occurrence を数える (import 1 行 + 使用箇所)。
# import 行を除いた使用箇所が **1 箇所のみ** (= workspace section) であることを期待。
USAGE_COUNT=$(grep -cE 'LayoutDashboard' "$TARGET" || true)
IMPORT_COUNT=$(grep -cE "^import .*LayoutDashboard" "$TARGET" || true)
NON_IMPORT_COUNT=$((USAGE_COUNT - IMPORT_COUNT))

if [ "$NON_IMPORT_COUNT" -gt 1 ]; then
  echo "ERROR: LibrarySidebar で LayoutDashboard が $NON_IMPORT_COUNT 箇所使われています"
  echo "  → PH-CF-700 C6 契約: workspace section の 1 箇所のみで使うこと"
  echo "  → タグ section / Type fallback に workspace アイコンを使わない"
  echo
  grep -nE 'LayoutDashboard' "$TARGET" | grep -vE '^[^:]+:[0-9]+:import' || true
  exit 1
fi

echo "✓ audit-library-sidebar-icons: LibrarySidebar の LayoutDashboard 使用は 1 箇所のみ"
