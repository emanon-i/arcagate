---
id: PH-20260427-466
status: todo
batch: 106
type: 改善
era: Distribution Era Hardening
---

# PH-466: Crash 監視実装 (Sentry SDK / ErrorBoundary 拡張)

## 問題

PH-461 (batch-104) で設計した Sentry self-hosted / SaaS Free tier への Crash 報告 (Opt-in default OFF) を実装。未補捉 panic / Promise reject の stack trace を release 品質判定に活用。

## 改修

1. **Rust 側**: `sentry = { version = "0.34", default-features = false, features = ["panic", "backtrace"] }` 追加 (~5MB)
   - `src-tauri/src/services/crash_monitor_service.rs` 新規:
     - `pub fn init(dsn: Option<String>)` (env var or settings から DSN 読込)
     - `panic_hook` 経由で sentry 統合
     - file path redact (`C:/Users/<user>/AppData/...` → `<APPDATA>/...`)
2. **フロント側**: `@sentry/svelte` (既存 `src/lib/components/common/ErrorBoundary.svelte` の `reportError` を Sentry SDK に切替)
   - default OFF 時は何もしない (toast のみ)
3. **PRIVACY.md と整合**:
   - 送信: panic message / stack trace / app_version / os_build
   - 送信外: DB 内容 / 設定値 / フォーカス中の操作内容
4. `PrivacySettings.svelte` (PH-465 で新設) に Crash Opt-in toggle 追加
5. `lib.rs setup` で crash_monitor_service 起動

## 受け入れ条件

- [ ] sentry-rust + @sentry/svelte 採用 (依存サイズ計測 5MB 目安)
- [ ] crash_monitor_service 実装 + redact_path unit test
- [ ] ErrorBoundary 拡張 (Sentry 統合 + Opt-in 判定)
- [ ] PrivacySettings に Crash toggle 追加 (default OFF)
- [ ] panic 発生時 → DSN 設定 + toggle ON のみ送信される (mock test)
- [ ] `pnpm verify` 全通過

## 横展開チェック

- PH-465 の PrivacySettings.svelte と統合 (1 画面で Telemetry + Crash の 2 toggle)
- redact policy は telemetry / crash 両方で再利用可能な共有 helper にする (`utils/redact.rs`)
- HTTP client は Sentry SDK が独自に管理するため PH-469 と分離 (依存予算で許容)
