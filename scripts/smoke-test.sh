#!/usr/bin/env bash
# CLI smoke test（pnpm verify:smoke から呼ばれる）
# 前段の cargo test でビルド済みのバイナリを直接参照する（再コンパイル不要）
set -e

CLI="src-tauri/target/debug/arcagate_cli"
[ -f "${CLI}.exe" ] && CLI="${CLI}.exe"

if [ ! -f "$CLI" ]; then
  echo "[smoke] ERROR: binary not found at $CLI"
  echo "  Run 'cargo build --manifest-path src-tauri/Cargo.toml --bin arcagate_cli' first."
  exit 1
fi

echo "[smoke] CLI --help check..."
"$CLI" --help > /dev/null
echo "[smoke] CLI --help: OK"

echo "[smoke] describe (all)..."
RESULT=$("$CLI" describe --json)
echo "$RESULT" | grep -q '"list"' \
  || { echo "[smoke] describe: FAILED"; echo "$RESULT"; exit 1; }
echo "[smoke] describe: OK"

echo "[smoke] describe create..."
RESULT=$("$CLI" describe create --json)
echo "$RESULT" | grep -q '"item_type"' \
  || { echo "[smoke] describe create: FAILED"; echo "$RESULT"; exit 1; }
echo "[smoke] describe create: OK"

# ── temp DB で隔離テスト ──────────────────────────────
TMPDB=$(mktemp 2>/dev/null || echo "/tmp/arcagate-smoke-$$.db")
trap 'rm -f "$TMPDB"' EXIT

echo "[smoke] list (empty DB)..."
RESULT=$("$CLI" --db "$TMPDB" list --json)
echo "$RESULT" | grep -q '\[\]' \
  || { echo "[smoke] list: FAILED"; echo "$RESULT"; exit 1; }
echo "[smoke] list: OK"

echo "[smoke] create (dry-run)..."
"$CLI" --db "$TMPDB" create url "Smoke Test" "https://example.com" --dry-run 2>&1 | grep -q 'dry-run' \
  || { echo "[smoke] create dry-run: FAILED"; exit 1; }
echo "[smoke] create dry-run: OK"

echo "[smoke] create (actual)..."
RESULT=$("$CLI" --db "$TMPDB" create url "Smoke Test" "https://example.com" --json)
echo "$RESULT" | grep -q 'Smoke Test' \
  || { echo "[smoke] create: FAILED"; echo "$RESULT"; exit 1; }
echo "[smoke] create: OK"

echo "[smoke] search..."
RESULT=$("$CLI" --db "$TMPDB" search smoke --json)
echo "$RESULT" | grep -q 'Smoke Test' \
  || { echo "[smoke] search: FAILED"; echo "$RESULT"; exit 1; }
echo "[smoke] search: OK"

echo "[smoke] create --json-input..."
RESULT=$("$CLI" --db "$TMPDB" create --json-input '{"item_type":"command","label":"Echo","target":"echo hello"}' --json)
echo "$RESULT" | grep -q 'Echo' \
  || { echo "[smoke] create json-input: FAILED"; echo "$RESULT"; exit 1; }
echo "[smoke] create json-input: OK"

echo "[smoke] input hardening: path traversal..."
if "$CLI" --db "$TMPDB" create exe "Bad" "../../.ssh/key" --dry-run 2>/dev/null; then
  echo "[smoke] path traversal should have been rejected"
  exit 1
fi
echo "[smoke] path traversal rejected: OK"

echo "[smoke] input hardening: control chars..."
if "$CLI" --db "$TMPDB" create url $'bad\x01name' "https://x.com" --dry-run 2>/dev/null; then
  echo "[smoke] control chars should have been rejected"
  exit 1
fi
echo "[smoke] control chars rejected: OK"

echo "[smoke] workspace create..."
RESULT=$("$CLI" --db "$TMPDB" workspace create "smoke-ws" --json)
echo "$RESULT" | grep -q 'smoke-ws' \
  || { echo "[smoke] workspace create: FAILED"; echo "$RESULT"; exit 1; }
echo "[smoke] workspace create: OK"

WS_ID=$(echo "$RESULT" | grep -o '"id"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | grep -o '[0-9a-f-]\{36\}')

echo "[smoke] workspace add-widget..."
RESULT=$("$CLI" --db "$TMPDB" workspace add-widget "$WS_ID" favorites --json)
echo "$RESULT" | grep -q 'favorites' \
  || { echo "[smoke] widget add: FAILED"; echo "$RESULT"; exit 1; }
echo "[smoke] workspace add-widget: OK"

WIDGET_ID=$(echo "$RESULT" | grep -o '"id"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | grep -o '[0-9a-f-]\{36\}')

echo "[smoke] workspace list-widgets..."
RESULT=$("$CLI" --db "$TMPDB" workspace list-widgets "$WS_ID" --json)
echo "$RESULT" | grep -q 'favorites' \
  || { echo "[smoke] list-widgets: FAILED"; echo "$RESULT"; exit 1; }
echo "[smoke] workspace list-widgets: OK"

echo "[smoke] workspace update-widget..."
RESULT=$("$CLI" --db "$TMPDB" workspace update-widget "$WIDGET_ID" --json-input '{"position_x":1,"position_y":2,"width":4,"height":3}' --json)
echo "$RESULT" | grep -q '"position_x": 1' \
  || { echo "[smoke] update-widget: FAILED"; echo "$RESULT"; exit 1; }
echo "[smoke] workspace update-widget: OK"

echo "[smoke] workspace remove-widget..."
RESULT=$("$CLI" --db "$TMPDB" workspace remove-widget "$WIDGET_ID" --json)
echo "$RESULT" | grep -q 'deleted' \
  || { echo "[smoke] remove-widget: FAILED"; echo "$RESULT"; exit 1; }
echo "[smoke] workspace remove-widget: OK"

echo "[smoke] workspace list..."
RESULT=$("$CLI" --db "$TMPDB" workspace list --json)
echo "$RESULT" | grep -q 'smoke-ws' \
  || { echo "[smoke] workspace list: FAILED"; echo "$RESULT"; exit 1; }
echo "[smoke] workspace list: OK"

echo "[smoke] run --dry-run..."
"$CLI" --db "$TMPDB" run "Smoke Test" --dry-run 2>&1 | grep -q 'dry-run' \
  || { echo "[smoke] run dry-run: FAILED"; exit 1; }
echo "[smoke] run dry-run: OK"

# ── CRUD completion ───────────────────────────────────

# Get item ID for update/delete tests
ITEM_ID=$(echo "$("$CLI" --db "$TMPDB" list --json)" | grep -o '"id"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | grep -o '[0-9a-f-]\{36\}')

echo "[smoke] update (dry-run)..."
"$CLI" --db "$TMPDB" update "$ITEM_ID" --json-input '{"label":"Updated Name"}' --dry-run 2>&1 | grep -q 'dry-run' \
  || { echo "[smoke] update dry-run: FAILED"; exit 1; }
echo "[smoke] update dry-run: OK"

echo "[smoke] update (actual)..."
RESULT=$("$CLI" --db "$TMPDB" update "$ITEM_ID" --json-input '{"label":"Updated Name"}' --json)
echo "$RESULT" | grep -q 'Updated Name' \
  || { echo "[smoke] update: FAILED"; echo "$RESULT"; exit 1; }
echo "[smoke] update: OK"

echo "[smoke] config set..."
"$CLI" --db "$TMPDB" config set test_key test_value 2>&1 | grep -q 'test_key' \
  || { echo "[smoke] config set: FAILED"; exit 1; }
echo "[smoke] config set: OK"

echo "[smoke] config get..."
RESULT=$("$CLI" --db "$TMPDB" config get test_key)
echo "$RESULT" | grep -q 'test_value' \
  || { echo "[smoke] config get: FAILED"; echo "$RESULT"; exit 1; }
echo "[smoke] config get: OK"

echo "[smoke] config get (json)..."
RESULT=$("$CLI" --db "$TMPDB" config get test_key --json)
echo "$RESULT" | grep -q '"value"' \
  || { echo "[smoke] config get json: FAILED"; echo "$RESULT"; exit 1; }
echo "[smoke] config get json: OK"

echo "[smoke] recent..."
RESULT=$("$CLI" --db "$TMPDB" recent --json)
# empty is fine, just check valid JSON array
echo "$RESULT" | grep -qE '^\[' \
  || { echo "[smoke] recent: FAILED"; echo "$RESULT"; exit 1; }
echo "[smoke] recent: OK"

echo "[smoke] frequent..."
RESULT=$("$CLI" --db "$TMPDB" frequent --json)
echo "$RESULT" | grep -qE '^\[' \
  || { echo "[smoke] frequent: FAILED"; echo "$RESULT"; exit 1; }
echo "[smoke] frequent: OK"

EXPORT_TMP=$(mktemp 2>/dev/null || echo "/tmp/arcagate-export-$$.json")
trap 'rm -f "$TMPDB" "$EXPORT_TMP"' EXIT

echo "[smoke] export..."
"$CLI" --db "$TMPDB" export "$EXPORT_TMP" 2>&1 | grep -q 'Exported' \
  || { echo "[smoke] export: FAILED"; exit 1; }
echo "[smoke] export: OK"

echo "[smoke] import (dry-run)..."
"$CLI" --db "$TMPDB" import "$EXPORT_TMP" --dry-run 2>&1 | grep -q 'dry-run' \
  || { echo "[smoke] import dry-run: FAILED"; exit 1; }
echo "[smoke] import dry-run: OK"

echo "[smoke] workspace delete..."
RESULT=$("$CLI" --db "$TMPDB" workspace delete "$WS_ID" --json)
echo "$RESULT" | grep -q 'deleted' \
  || { echo "[smoke] workspace delete: FAILED"; echo "$RESULT"; exit 1; }
echo "[smoke] workspace delete: OK"

echo "[smoke] delete..."
RESULT=$("$CLI" --db "$TMPDB" delete "$ITEM_ID" --json)
echo "$RESULT" | grep -q 'deleted' \
  || { echo "[smoke] delete: FAILED"; echo "$RESULT"; exit 1; }
echo "[smoke] delete: OK"

# ── Error paths & edge cases ─────────────────────────────────

echo "[smoke] delete nonexistent ID..."
if "$CLI" --db "$TMPDB" delete "00000000-0000-0000-0000-000000000000" --json 2>/dev/null; then
  echo "[smoke] delete nonexistent: should have failed"
  exit 1
fi
echo "[smoke] delete nonexistent: OK"

echo "[smoke] import (actual round-trip)..."
IMPORT_DB=$(mktemp 2>/dev/null || echo "/tmp/arcagate-import-$$.db")
trap 'rm -f "$TMPDB" "$EXPORT_TMP" "$IMPORT_DB"' EXIT
"$CLI" --db "$IMPORT_DB" import "$EXPORT_TMP" 2>&1 | grep -q 'Imported' \
  || { echo "[smoke] import actual: FAILED"; exit 1; }
echo "[smoke] import actual: OK"

echo "[smoke] run nonexistent name..."
if "$CLI" --db "$TMPDB" run "NonExistentItem_XYZ" --dry-run 2>/dev/null; then
  echo "[smoke] run nonexistent: should have failed"
  exit 1
fi
echo "[smoke] run nonexistent: OK"

echo "[smoke] update nonexistent ID..."
if "$CLI" --db "$TMPDB" update "00000000-0000-0000-0000-000000000000" --json-input '{"label":"X"}' 2>/dev/null; then
  echo "[smoke] update nonexistent: should have failed"
  exit 1
fi
echo "[smoke] update nonexistent: OK"

echo "[smoke] update malformed JSON..."
if "$CLI" --db "$TMPDB" update "$ITEM_ID" --json-input '{bad json' 2>/dev/null; then
  echo "[smoke] update malformed JSON: should have failed"
  exit 1
fi
echo "[smoke] update malformed JSON: OK"

echo "[smoke] workspace update-widget malformed JSON..."
if "$CLI" --db "$TMPDB" workspace update-widget "00000000-0000-0000-0000-000000000000" --json-input '{bad' 2>/dev/null; then
  echo "[smoke] ws update-widget malformed JSON: should have failed"
  exit 1
fi
echo "[smoke] workspace update-widget malformed JSON: OK"

echo "[smoke] create invalid item_type..."
if "$CLI" --db "$TMPDB" create invalid_type "Test" "target" 2>/dev/null; then
  echo "[smoke] create invalid type: should have failed"
  exit 1
fi
echo "[smoke] create invalid item_type: OK"

echo "[smoke] config set with control chars..."
if "$CLI" --db "$TMPDB" config set $'bad\x01key' "value" 2>/dev/null; then
  echo "[smoke] config set control chars: should have failed"
  exit 1
fi
echo "[smoke] config set control chars: OK"

echo "[smoke] export path traversal..."
if "$CLI" --db "$TMPDB" export "../../etc/evil.json" 2>/dev/null; then
  echo "[smoke] export path traversal: should have failed"
  exit 1
fi
echo "[smoke] export path traversal: OK"

echo "[smoke] import path traversal..."
if "$CLI" --db "$TMPDB" import "../../etc/evil.json" 2>/dev/null; then
  echo "[smoke] import path traversal: should have failed"
  exit 1
fi
echo "[smoke] import path traversal: OK"
