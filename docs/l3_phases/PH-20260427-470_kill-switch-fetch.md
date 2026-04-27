---
id: PH-20260427-470
status: todo
batch: 106
type: 改善
era: Distribution Era Hardening
---

# PH-470: kill-switch HTTP fetch 本番化 (stub 解消)

## 問題

PH-468 (batch-105) で kill-switch service skeleton を実装したが `fetch_disabled_json()` が stub (常に Err) で実機での無効化判定が機能しない。PH-469 で実装する HTTP client 共通基盤を流用して fetch を本番化する。

## 改修

1. `kill_switch_service::fetch_disabled_json()` を PH-469 の `utils::http_client::get_with_timeout` で実装
   - URL: `https://github.com/emanon-i/arcagate/releases/latest/download/disabled.json`
   - timeout: 5s
   - status 200 のみ accept、404/500/timeout は Err
2. `serde_json` で `DisabledJson` parse、parse error も best-effort で Err 扱い
3. `cmd_check_kill_switch(state, version) -> Result<KillSwitchResult, AppError>` IPC 公開
4. `lib.rs setup` でアプリ起動時に呼ぶ (タイムアウト 5s で起動を阻害しない)
5. `src/lib/components/common/KillSwitchDialog.svelte` 新規:
   - `disabled=true` 時に modal 表示
   - 「強制終了」ボタンのみ (操作不能)
   - `disabled.json` の `message` 表示
6. e2e: mock server で `disabled_versions: ["0.1.0"]` 配信 → dialog 表示確認

## 受け入れ条件

- [ ] PH-469 の HTTP client で fetch 実装
- [ ] cmd_check_kill_switch IPC 公開
- [ ] KillSwitchDialog.svelte 実装 + e2e
- [ ] 既存 4 unit test PASS (回帰なし)
- [ ] timeout 時 disabled=false (best-effort 維持)
- [ ] `pnpm verify` 全通過

## 横展開チェック

- HTTP client は PH-469 と統一
- `lib.rs setup` 起動時呼び出しが起動 P95 2s 目標 (vision.md) を悪化させないか計測
