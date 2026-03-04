#!/usr/bin/env bash
# CLI + MCP サーバーの smoke test（pnpm verify:smoke から呼ばれる）
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

echo "[smoke] MCP tools/list check..."
RESULT=$(printf '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}\n' \
  | "$CLI" mcp 2>/dev/null)
if echo "$RESULT" | grep -q "arcagate_list"; then
  echo "[smoke] MCP tools/list: OK"
else
  echo "[smoke] MCP tools/list: FAILED"
  echo "Output: $RESULT"
  exit 1
fi

# ── workspace MCP テスト (temp DB で隔離) ──────────────────────────
TMPDB=$(mktemp 2>/dev/null || echo "/tmp/arcagate-smoke-$$.db")
trap 'rm -f "$TMPDB"' EXIT

echo "[smoke] Workspace: allow write..."
"$CLI" --db "$TMPDB" mcp --allow-write arcagate_workspace_create      > /dev/null
"$CLI" --db "$TMPDB" mcp --allow-write arcagate_workspace_add_widget  > /dev/null

echo "[smoke] Workspace: create..."
WS_RESULT=$(printf '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"arcagate_workspace_create","arguments":{"name":"smoke-ws"}}}\n' \
  | "$CLI" --db "$TMPDB" mcp 2>/dev/null)
echo "$WS_RESULT" | grep -q 'smoke-ws' \
  || { echo "[smoke] Workspace create: FAILED"; echo "$WS_RESULT"; exit 1; }
echo "[smoke] Workspace create: OK"

# UUID v7 を抽出（先頭が workspace id）
WS_ID=$(echo "$WS_RESULT" | grep -o '[0-9a-f]\{8\}-[0-9a-f]\{4\}-[0-9a-f]\{4\}-[0-9a-f]\{4\}-[0-9a-f]\{12\}' | head -1)

echo "[smoke] Widget: add favorites..."
WDG_RESULT=$(printf '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"arcagate_workspace_add_widget","arguments":{"workspace_id":"%s","widget_type":"favorites"}}}\n' "$WS_ID" \
  | "$CLI" --db "$TMPDB" mcp 2>/dev/null)
echo "$WDG_RESULT" | grep -q 'favorites' \
  || { echo "[smoke] Widget add: FAILED"; echo "$WDG_RESULT"; exit 1; }
echo "[smoke] Widget add: OK"

echo "[smoke] Workspace: list (persistence)..."
LIST_RESULT=$(printf '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"arcagate_workspace_list","arguments":{}}}\n' \
  | "$CLI" --db "$TMPDB" mcp 2>/dev/null)
echo "$LIST_RESULT" | grep -q 'smoke-ws' \
  || { echo "[smoke] Workspace list: FAILED"; echo "$LIST_RESULT"; exit 1; }
echo "[smoke] Workspace list: OK"
