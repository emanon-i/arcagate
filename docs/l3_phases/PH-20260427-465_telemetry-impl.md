---
id: PH-20260427-465
status: todo
batch: 106
type: 改善
era: Distribution Era Hardening
---

# PH-465: Telemetry 実装本体 (Opt-in default OFF)

## 問題

PH-460 (batch-104) で設計した匿名 Telemetry の実装着手。release 品質判定を主観依存から脱却するため、最小限の数値 (version / OS / WebView2 / 操作カウント / AppError code) を匿名収集する。

## 改修

1. **endpoint 採用判断**: PostHog SaaS Free tier (月 1M events) または PostHog self-hosted。**SDK は使わず**、`utils/http_client.rs::post_json` で直接 POST (PH-469 batch-106 で確認: PH-469 のみで exe 19.89MB、20MB 上限 cap タイトすぎ。PostHog SDK 追加余地なし)
2. `src-tauri/src/services/telemetry_service.rs` 新規:
   - `pub fn record_event(event: &str, props: &Value)` (内部 buffer に積む)
   - `pub fn flush() -> Result<(), AppError>` (buffer を一括 POST、24h interval で呼ぶ)
   - 匿名識別子なし、UUID 生成しない (batch あたり session id のみ in-memory)
3. **送信内容** (PRIVACY.md と整合):
   - app_version / os_build / arch / webview_version
   - launch_count / palette_open_count / search_count
   - error_code 別 count (`launch.file_not_found: 3`)
4. **送信外** (絶対 NG): 個別アイテム名 / path / クエリ内容 / IP / UUID
5. `src/lib/components/settings/PrivacySettings.svelte` 新規 (Opt-in toggle、default OFF)
6. `lib.rs setup` で telemetry_service 起動 (24h interval timer)

## 受け入れ条件

- [ ] PostHog SaaS Free tier or self-hosted 採用判断 (依存サイズ計測)
- [ ] telemetry_service 実装 + unit test
- [ ] PrivacySettings.svelte 実装 (toggle、default OFF)
- [ ] PRIVACY.md 内容と送信フィールド一致 (機械検証 or 手動 audit)
- [ ] e2e: Opt-in toggle が config に永続化される
- [ ] `pnpm verify` 全通過

## 横展開チェック

- HTTP client は PH-469 と共有
- AppError code 列挙 (`utils/error.rs` の `AppError::code()`) と Telemetry 送信フィールドの整合
