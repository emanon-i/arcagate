# Release Readiness Criteria — E エラー処理 + F 配布要件

**Predecessor**: [criteria.md](./criteria.md)

## E. エラー処理

### E1. panic / unhandled rejection ユーザー表示

- **Verification**: Rust 側で意図的に panic させる (test command) → app が即終了せず error dialog 表示、Frontend で `throw` を意図的にやる → ErrorState component で表示
- **Pass criteria**: panic 時に user に「予期しないエラーが発生しました、再起動してください」程度の dialog が出る (silent crash 禁止)
- **Tooling**: dev で test panic command 経由 + screenshot、`grep -rn "set_panic_hook\|unhandledrejection" src-tauri/src/ src/lib/`

### E2. crash recovery / restart on crash

- **Verification**: app crash (Task Manager kill) → 再起動 → 直前の workspace / Library 状態が復元される
- **Pass criteria**: workspace / library card 永続化が DB に書かれており、再起動で同 state、未保存の編集中 data はロストでも crash report が残る
- **Tooling**: `taskkill /F /IM arcagate.exe` → 再起動 → 視覚確認 + log 確認

### E3. 設定ファイル破損時 restore

- **Verification**: `%LOCALAPPDATA%\arcagate\config\*.json` (or DB の config table) を破壊 → 起動
- **Pass criteria**: 破損検知 → default 値で起動 + user に通知、または backup から復元
- **Tooling**: 手動破壊 + 起動、ログ確認

### E4. AppError serialize 構造

- **Verification**: `AppError` が `{ code, message }` の構造で serialize、frontend で `getErrorCode(e)` / `getErrorMessage(e)` 経由で扱える
- **Pass criteria**: `grep -rn "code:" src-tauri/src/utils/error.rs`、TS 側 `formatIpcError` / `getErrorCode` が string contains ではなく structured 判定
- **Tooling**: source 確認 + lessons.md AppError serialize 規格確認

### E5. updater error handling

- **Verification**: updater 経路でネットワーク失敗 / 署名検証失敗 を意図的に発生 → graceful fallback
- **Pass criteria**: updater 失敗時に user 操作を妨げない (silent retry + log + 通知)、updater が main app の起動を block しない
- **Tooling**: `grep -rn "tauri-plugin-updater" src-tauri/`、設定確認

### E6. log rotation

- **Verification**: `tauri-plugin-log` 設定で `KeepSome(7)` + 5MB cap に設定済 (lib.rs L106-107 で確認)
- **Pass criteria**: log file が 5MB 超えたら rotate、7 世代保持
- **Tooling**: source 確認 + 実機で 5MB+ log 生成 (大量操作) → rotation 動作目視

## F. 配布要件

### F1. MSI / NSIS installer build

- **Verification**: `pnpm tauri build` で MSI / NSIS 両方が生成される (既存 `pnpm verify` 末尾で確認)
- **Pass criteria**: `src-tauri/target/release/bundle/msi/*.msi` + `nsis/*.exe` の 2 ファイルが生成、既知 user 環境 (Win11 x64) で installer 完走
- **Tooling**: `pnpm tauri build` + 手動インストールテスト (test 用 VM)

### F2. code signing

- **Verification**: 配布 binary に signature が付いているか確認 (`Get-AuthenticodeSignature .\Arcagate.exe`)
- **Pass criteria**: 当面は **GH Releases (signing なし)** で OK だが release notes に「未署名のため SmartScreen 警告が出る」明記、長期は code signing 取得
- **Tooling**: PowerShell signature 確認、release notes draft、user の distribution 方針 memo 参照

### F3. updater 設定 (Tauri updater)

- **Verification**: `tauri.conf.json` に updater endpoint URL + pubkey 設定済、`tauri-plugin-updater` で `check()` が動く
- **Pass criteria**: updater pubkey が設定 (privatekey は repo 外)、endpoint が GH Releases / 任意 host を指す、update check が起動時 + 手動 trigger で動く
- **Tooling**: `cat src-tauri/tauri.conf.json | jq '.bundle.updater'`、existing `updater.svelte.ts` の動作確認

### F4. SBOM 生成

- **Verification**: `npm sbom --sbom-format=cyclonedx > sbom-npm.json` + `cargo cyclonedx` (or `cargo-sbom`) で SBOM 生成
- **Pass criteria**: npm + cargo 両方の SBOM が生成され、release artifact に同梱
- **Tooling**: 上記コマンド、CI で生成 → release upload

### F5. crash reporting / telemetry / kill-switch

- **Verification**: `cmd_check_kill_switch` 存在 (lib.rs L29) + telemetry opt-in (`cmd_get_telemetry_opt_in` lib.rs L13-14) + crash_report_opt_in 存在 (L13)
- **Pass criteria**: 1) kill switch IPC 動作 / 2) telemetry opt-in default OFF + 切替えで設定保持 / 3) crash report opt-in default OFF + 切替えで設定保持
- **Tooling**: `grep -rn "kill_switch\|telemetry_opt_in\|crash_report" src-tauri/src/`、Settings dialog で切替え目視

### F6. privacy / license / EULA

- **Verification**: Settings 画面に「プライバシー」「ライセンス」「利用規約」link or 表示があるか
- **Pass criteria**: README / installer / Settings のいずれかで privacy policy / license が user に提示される、telemetry / crash report の opt-in が明記される
- **Tooling**: `grep -rn "privacy\|license\|EULA\|プライバシー\|ライセンス\|利用規約" src/lib/components/arcagate/settings/ docs/`

### F7. installer 実行で AV / SmartScreen 警告

- **Verification**: 未署名 installer を Win11 で実行 → SmartScreen / Defender の警告内容を記録
- **Pass criteria**: 警告が出るのは仕様 (未署名のため)、ただし release notes に **明記** + 「実行する」 で続行可能
- **Tooling**: 手動 install + screenshot

### F8. uninstall flow

- **Verification**: MSI / NSIS の uninstall を実行 → app data dir / レジストリ / scheduled tasks の cleanup を確認
- **Pass criteria**: uninstall で binary 削除 + Start menu shortcut 削除、ただし user data (Library / workspace) は **残す** (復元可能)
- **Tooling**: 手動 uninstall + `Get-ChildItem $env:LOCALAPPDATA\arcagate` 確認

### F9. release artifact 整合

- **Verification**: GH Releases に msi / exe / sha256 / SBOM が一括 upload されるか
- **Pass criteria**: artifact に sha256 checksum 同梱、SBOM 同梱、changelog 含む release notes
- **Tooling**: GitHub Actions release workflow 確認、または手動 release flow doc 化

### F10. autoupdate 経路の安全性

- **Verification**: tauri-plugin-updater の signature 検証が enabled、pubkey が tauri.conf.json に設定
- **Pass criteria**: updater 経路で偽 update を弾く (signature mismatch で reject)、pubkey が repo 内に commit 済 (privatekey は外部)
- **Tooling**: `cat src-tauri/tauri.conf.json` で pubkey 設定確認 + tauri-plugin-updater 仕様準拠
