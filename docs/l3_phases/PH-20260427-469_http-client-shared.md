---
id: PH-20260427-469
status: todo
batch: 106
type: 改善
era: Distribution Era Hardening
---

# PH-469: HTTP client 共有実装 (kill-switch / Telemetry / Crash 監視 共通基盤)

## 問題

batch-105 で kill-switch service skeleton (PH-468) を実装したが HTTP fetch は stub 状態。Telemetry (PH-465) / Crash 監視 (PH-466) も HTTP POST が必要。3 用途で別々の HTTP client を持つと依存サイズが膨らむため、共通 HTTP module を batch-106 で先行実装する。

## 改修

1. `src-tauri/Cargo.toml` に `ureq = "2.10"` (lite な blocking HTTP、tokio 不要、~500KB) または `reqwest` (Tauri が transitively 持つ可能性) のいずれか採用判断
2. `src-tauri/src/utils/http_client.rs` 新規:
   - `fn get_with_timeout(url: &str, timeout: Duration) -> Result<String, AppError>`
   - `fn post_json_with_timeout(url: &str, payload: &Value, timeout: Duration) -> Result<(), AppError>`
   - User-Agent: `Arcagate/<version> (Windows)`
   - SHA256 verify hook (kill-switch / updater 署名検証で再利用)
3. `kill_switch_service::fetch_disabled_json()` を stub から実装に切替
4. `kill_switch_service::check()` を `lib.rs setup` で起動時に呼ぶ + `cmd_check_kill_switch` IPC 公開
5. フロント側 `KillSwitchDialog.svelte` (検出時の警告 + 強制終了ボタン)

## 受け入れ条件

- [ ] HTTP client crate 採用判断 (依存サイズ計測)
- [ ] `utils/http_client.rs` 実装 + unit test (mock server 使用)
- [ ] `kill_switch_service::fetch_disabled_json` 実装
- [ ] `cmd_check_kill_switch` IPC 公開 + svelte-check pass
- [ ] `KillSwitchDialog.svelte` 表示 E2E
- [ ] `pnpm verify` 全通過

## 別 plan (batch-106 後続)

- PH-465 Telemetry POST (PostHog endpoint or 自前 endpoint、本 HTTP client 流用)
- PH-466 Crash 監視 POST (Sentry endpoint、本 HTTP client 流用)

## 横展開チェック

- 既存 reqwest / ureq 依存の重複確認 (cargo tree --duplicates)
- TLS roots 共有 (rustls or native-tls)
