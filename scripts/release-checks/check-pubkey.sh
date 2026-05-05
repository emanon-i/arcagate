#!/usr/bin/env bash
# check-pubkey.sh
#
# tauri.conf.json の updater pubkey が PLACEHOLDER でないことを検証。
# release blocker として CI で必須化。
#
# B-1 deferred 期間中は WARN だけ出して exit 0 (release tag push 時のみ exit 1 にしたい場合は
# release.yml で IS_RELEASE 環境変数を見て分岐)。

set -euo pipefail

cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

CONF=src-tauri/tauri.conf.json

if [ ! -f "$CONF" ]; then
	echo "FAIL: $CONF MISSING"
	exit 1
fi

pubkey=$(grep -oP '"pubkey"\s*:\s*"[^"]*"' "$CONF" | head -1 | grep -oP '"[^"]*"$' | tr -d '"' || true)

if [ -z "$pubkey" ]; then
	echo "WARN: pubkey field not found in $CONF"
	exit 0
fi

if [[ "$pubkey" == *PLACEHOLDER* ]] || [[ "$pubkey" == *placeholder* ]]; then
	echo "WARN (B-1 deferred): updater pubkey is PLACEHOLDER. updater 動作不能、release tag push 前に user 作業で生成必要 (deferred)。"
	# release tag push 時のみ blocker 化したい場合:
	if [ "${IS_RELEASE_TAG:-0}" = "1" ]; then
		echo "FAIL: release tag push なのに pubkey が PLACEHOLDER (release blocker)"
		exit 1
	fi
	exit 0
fi

# pubkey が "untrusted comment:" 始まりの minisign 公開鍵 base64 なら正常 (tauri-plugin-updater 仕様)
if [[ "${#pubkey}" -lt 40 ]]; then
	echo "WARN: pubkey looks too short ($pubkey)、minisign 形式でない可能性"
	exit 0
fi

echo "OK: pubkey set, length=${#pubkey}"
