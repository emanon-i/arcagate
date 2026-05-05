# Release Readiness Audit — E error + F 配布

**Predecessor**: [audit.md](./audit.md)

## E. エラー処理

### E1. panic / unhandled rejection ユーザー表示 — **部分的**

- **根拠**: `services/crash_monitor_service.rs` で `register_panic_hook()` 実装。panic 時の CrashReport assemble + Sentry endpoint POST 経路 (telemetry opt-in で gate)。`ErrorBoundary.svelte` 存在で frontend error は ErrorState で表示。
- **gap**: panic 時の **user 向け dialog 表示** は未確認。crash report は内部 collect 済だが「予期しないエラー、再起動してください」 dialog UI が存在するか確認必要。

### E2. crash recovery / restart on crash — **部分的**

- **根拠**: workspace / Library 永続化は SQLite + WAL で commit 即反映、再起動で同 state は仕様上担保。
- **gap**: Task Manager kill → 再起動 → 復元の **手動検証未実施**。J5 release-checklist で要求。

### E3. 設定ファイル破損時 restore — **未検証 (user 手動)**

- **根拠**: 破損時の挙動を検証する code path が未確認。
- **gap**: 手動 DB / config 破壊テスト未実施、recovery dialog 実装の有無を確認必要。

### E4. AppError serialize 構造 — **PASS**

- **根拠**: `src-tauri/src/utils/error.rs:50` に `impl serde::Serialize for AppError` 実装、`{ code, message }` 構造で serialize。Frontend `formatIpcError` / `getErrorCode` で structured 判定 (lessons.md AppError serialize 規格準拠)。

### E5. updater error handling — **PASS**

- **根拠**: `src-tauri/Cargo.toml` に `tauri-plugin-updater = "2"`、`tauri.conf.json` で `"active": true` + `"dialog": false`。`src/lib/state/updater.svelte.ts` 存在 (CLAUDE.md auto-check 経路)。
- **メモ**: error 時の retry / log 経路は updater.svelte.ts 内で実装済の前提 (詳細実装確認は L4 distribution era で深掘り)。

### E6. log rotation — **PASS**

- **根拠**: `src-tauri/src/lib.rs` で `tauri_plugin_log` を `KeepSome(7)` + `max_file_size(5 * 1024 * 1024)` (5MB) で設定。

## F. 配布要件

### F1. MSI / NSIS installer build — **PASS**

- **根拠**: `pnpm verify` 末尾で `pnpm tauri build` 実行 → MSI / NSIS 両方が `src-tauri/target/release/bundle/{msi,nsis}/` に生成される (本 audit でも実行確認済、msi `Arcagate_0.1.0_x64_en-US.msi` + nsis `Arcagate_0.1.0_x64-setup.exe`)。

### F2. code signing — **未検証 (user 判断)**

- **根拠**: `.github/workflows/release.yml` で `WINDOWS_CERTIFICATE` secret 経路あり (sign-windows.ps1)、ただし secret 設定状況は agent では確認不可。
- **gap**: GH Releases (signing なし) で当面 OK 方針 (CLAUDE.md / project_arcagate_distribution.md)、release notes に「未署名」明記が必要。

### F3. updater 設定 (Tauri updater) — **FAIL**

- **根拠**: `src-tauri/tauri.conf.json` の `bundle.updater.pubkey` が **`"PLACEHOLDER_REGENERATE_WITH_TAURI_SIGNER"`** で commit されている。これでは signature 検証が成立せず、本物の signed update も検証失敗で reject される。
- **影響**: updater 経路は **動作不能**。release blocker 候補。
- **修正**: `tauri signer generate` で keypair 生成 → pubkey を `tauri.conf.json` に commit、privatekey は `TAURI_SIGNING_PRIVATE_KEY` secret で外部保管。

### F4. SBOM 生成 — **未検証**

- **根拠**: `npm sbom` / `cargo cyclonedx` の生成 step が `release.yml` にあるか確認必要。
- **gap**: `.github/workflows/release.yml` の build / sign / sig step は確認済だが SBOM step の有無は別途確認。release 前に追加検討。

### F5. crash reporting / telemetry / kill-switch — **PASS**

- **根拠**: `cmd_check_kill_switch` (`src-tauri/src/commands/kill_switch_commands.rs` 経由)、`cmd_get_telemetry_opt_in` / `cmd_set_telemetry_opt_in` / `cmd_get_crash_report_opt_in` / `cmd_set_crash_report_opt_in` 全て `lib.rs` で register。`PrivacySettings.svelte` で UI 切替実装、both default OFF (`onMount` で initial false)。

### F6. privacy / license / EULA — **PASS** (R5-1 訂正)

- **根拠**: `AboutSection.svelte` で `License` 表示。`PrivacySettings.svelte:49` に `<a href=".../PRIVACY.md">PRIVACY.md</a>` link 既存、telemetry / crash opt-in 切替実装。`README.md` の MIT badge + プライバシー 節 + (R4-A) サポート 節。`PRIVACY.md` 既存 (root)。
- **R2 audit 訂正**: 旧記述「link 無し」は誤り (grep path 誤り、`src/lib/components/arcagate/settings/` ではなく実際は `src/lib/components/settings/`)。S-7 (gap-list) 不要、本軸 PASS で完結。

### F7. installer 実行で AV / SmartScreen 警告 — **未検証 (user 手動)**

- **根拠**: 未署名のため警告は予期される。release notes 草案に明記が必要。
- **gap**: J5 release-checklist で要求、release notes に明記。

### F8. uninstall flow — **未検証 (user 手動)**

- **根拠**: MSI / NSIS の uninstall 動作は build 設定上は標準だが手動検証未実施。
- **gap**: J5 release-checklist で要求。

### F9. release artifact 整合 — **PASS**

- **根拠**: `release.yml` で `gh release create` + bundle / latest.json 添付経路が doc 化 (header コメント L11)。
- **メモ**: sha256 / SBOM 同梱は別途確認 (F4)。

### F10. autoupdate 経路の安全性 — **FAIL**

- **根拠**: F3 と同根、pubkey が PLACEHOLDER。signature 検証が動作しないため偽 update も signed update も reject される。
- **修正**: F3 fix と同時。
