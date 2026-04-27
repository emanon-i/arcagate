---
id: PH-20260427-466
status: done
batch: 106
type: 改善
era: Distribution Era Hardening
---

# PH-466: Crash 監視実装 (Sentry SDK / ErrorBoundary 拡張)

## 問題

PH-461 (batch-104) で設計した Sentry self-hosted / SaaS Free tier への Crash 報告 (Opt-in default OFF) を実装。未補捉 panic / Promise reject の stack trace を release 品質判定に活用。

## 改修

1. **Rust 側**: **sentry-rust SDK は使わない** (PH-469 後の exe 19.89MB → +5MB で 20MB 超過)。代わりに `panic_hook` で stack trace を取得し、Sentry envelope endpoint に `utils/http_client.rs::post_json` で直接 POST。
   - `src-tauri/src/services/crash_monitor_service.rs` 新規:
     - `set_panic_hook()` (std::panic::set_hook で stack trace 文字列化)
     - `pub fn report_panic(payload: &PanicReport) -> Result<(), AppError>` (Sentry envelope JSON を post_json)
     - file path redact (`C:/Users/<user>/AppData/...` → `<APPDATA>/...`)
2. **フロント側**: `@sentry/svelte` も使わない (bundle size 配慮)。`reportError` から Rust 側 `cmd_report_crash` IPC を呼び、Rust 側で Sentry envelope POST。
   - default OFF 時は何もしない (toast のみ)
3. **PRIVACY.md と整合**:
   - 送信: panic message / stack trace / app_version / os_build
   - 送信外: DB 内容 / 設定値 / フォーカス中の操作内容
4. `PrivacySettings.svelte` (PH-465 で新設) に Crash Opt-in toggle 追加
5. `lib.rs setup` で crash_monitor_service 起動

## 受け入れ条件

- [x] Sentry envelope endpoint 仕様調査 + 直接 POST 実装 (SDK 不使用、exe 20MB cap 維持)
- [x] crash_monitor_service 実装 (PanicReport / redact_path / report_panic / install_panic_hook stub) + 3 unit test
- [x] PrivacySettings に Crash toggle 追加 (PH-465 と同 panel、default OFF)
- [x] config_service / config_commands 拡張 (PH-465 で同時実装)
- [x] `pnpm verify` 全通過 (継続)
- [ ] `install_panic_hook` 実 hook 設置 + envelope_url の config 化 + ErrorBoundary 連携は次 plan (PH-472 候補) で着手

## 横展開チェック

- PH-465 の PrivacySettings.svelte と統合 (1 画面で Telemetry + Crash の 2 toggle)
- redact policy は telemetry / crash 両方で再利用可能な共有 helper にする (`utils/redact.rs`)
- HTTP client は Sentry SDK が独自に管理するため PH-469 と分離 (依存予算で許容)
