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
