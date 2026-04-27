# Distribution Readiness — Release Go/No-go チェックリスト

PH-457 (batch-103) で新設。Codex Rule C 4 回目「Polish 完走 No-go、Distribution 継続」判定に基づき、v0.2.0 リリース前に必須項目を可視化。

各項目に **担当 PH ID** + **状態** + **Held フラグ** を明示。

## 凡例

- ✅ **Done**: 受け入れ条件達成、main 反映済
- 🟡 **WIP**: 着手中
- 🔴 **Critical**: Release 前必須、未達なら No-go
- 🟢 **High**: Release 前推奨、未達は Pre-release 公開可
- 🟠 **Held**: ユーザ作業待ち (鍵生成 / 証明書取得 / Secret 登録 等)

---

## 🔴 Critical (Release 前必須)

### 1. version 3 点同期 — ✅ Done (PH-454)

`package.json` / `Cargo.toml` / `tauri.conf.json` の version 一致。
`scripts/audit-version-sync.sh` で自動検証、CI で必須。

### 2. Updater pubkey 本番化 — 🟠 Held (PH-455)

`tauri.conf.json plugins.updater.pubkey` が `PLACEHOLDER_REGENERATE_WITH_TAURI_SIGNER`。
本番化手順:

1. `npm run tauri signer generate -- -w ~/.tauri/arcagate.key`
2. 公開鍵を tauri.conf.json embed
3. 秘密鍵を GitHub Secret `TAURI_SIGNING_PRIVATE_KEY` (+ password) に登録

**Held 理由**: ユーザの local 鍵生成 + Secret 登録待ち (PC 前到着まで保留)。

### 3. Authenticode コード署名証明書 — 🟠 Held (PH-441 infra done)

署名 infra (tauri.conf.json + scripts/sign-windows.ps1 + release.yml の signing step) は実装済み (PH-441)。
**Held 理由**: 実証明書取得 (EV / OV / Azure Code Signing) 待ち。

候補:

- EV 証明書 (即時 SmartScreen 有効、年 $300-500)
- OV 証明書 (reputation accumulate、年 $100-200)
- Azure Trusted Signing ($9.99/月)

GitHub Secret 登録: `WINDOWS_CERTIFICATE` (PFX base64) + `WINDOWS_CERTIFICATE_PASSWORD`

---

## 🟢 High (Release 前推奨)

### 4. Updater 自動チェック — ✅ Done (PH-456)

起動時 + 24h 間隔で `tauri-plugin-updater::check()`、利用可能なら toast 通知。
pubkey 本番化 (PH-455) 後に実動作。

### 5. SBOM 生成 — ✅ Done (PH-448)

`scripts/generate-sbom.ps1` 新設、CycloneDX format で Rust + npm 依存を出力。
Release workflow (release.yml) で自動生成 + Release assets に添付。

### 6. Release workflow — ✅ Done (PH-447)

`.github/workflows/release.yml` (tag push → tauri build → 署名 → SBOM → latest.json → draft Release)。
証明書 / 鍵 secrets が無くても build は通る (sign / sig 生成は skip)。

### 7. 配布 README — ✅ Done (PH-449)

`INSTALL.md` (ユーザ向け、SmartScreen 警告対処 / WebView2 / 自動アップデート) +
`RELEASE.md` (メンテナ向け、tag push / 鍵管理 / ロールバック)。

### 8. Rollback / kill-switch SOP — ✅ Done (PH-458)

`docs/distribution-rollback-sop.md` 新設、検知 → 判断 → 実行 → 事後分析 のフロー。

---

## 🟢 High (Release 後継続改善)

### 9. SmartScreen reputation 戦略

EV 証明書なら即時、OV ならインストール数 / 経過時間で accumulate。
v0.2.0 OV release で最低 1〜3 ヶ月の蓄積期間を見込む。

### 10. Telemetry / Crash 監視

Codex Q4 #7 で指摘、現状未実装。最小実装でも:

- 匿名 startup イベント (バージョン + Windows ビルド)
- Crash 自動 report (sentry-rust 等、batch-104 候補)

### 11. Maintenance Era (regression / dependency 更新)

batch-104 以降。dependabot 等で依存自動更新 + SBOM 再生成。

---

## v0.2.0 Release Go/No-go 判定

### Go 条件

- 🔴 #1 (version 同期) ✅ Done
- 🔴 #2 (Updater pubkey) **Held → 解消必須**
- 🔴 #3 (Authenticode 証明書) **Held → 解消必須**
- 🟢 #4-8 全 Done

### 現状判定

**No-go** (#2 + #3 が Held のため)。

ユーザ作業 (鍵生成 / 証明書取得 / Secret 登録) 完了後に再判定。

### Pre-release (v0.2.0-rc) 公開条件

#3 (Authenticode 証明書) が未取得でも、**unsigned exe + SmartScreen 警告許容** で Pre-release 公開可。
ただし Updater (#2) は鍵がないと自動更新できないため、rc 段階では「手動 download + 再インストール」運用。

---

## 参照

- `codex-review-batch-101.md` Q3 (Critical/High 4 件)
- `codex-review-batch-101.md` Q4 (Distribution Era 残作業 7 件)
- `RELEASE.md` (メンテナ向け運用手順)
- `INSTALL.md` (ユーザ向けインストール)
- `docs/distribution-rollback-sop.md` (PH-458)
