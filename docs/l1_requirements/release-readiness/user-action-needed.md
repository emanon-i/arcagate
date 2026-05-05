# User-Action-Needed Items

agent では完結できず **user の物理アクション / 課金 / 環境固有検証** が必要な項目を分離。
agent 側は本 doc を更新し、scope の境界を明示する。

## B-1. updater pubkey 設定 (deferred、release blocker 降格)

### 現状

`src-tauri/tauri.conf.json` の `plugins.updater.pubkey` が:

```
"PLACEHOLDER_REGENERATE_WITH_TAURI_SIGNER"
```

(以前の本 doc は `bundle.updater.pubkey` と記載していたが、Tauri v2 では `plugins.updater.pubkey` が正、修正済)

### 影響

- updater 経路で signature 検証が成立しない
- 本物の signed update も検証失敗で reject される
- 偽 update も技術的には reject されるが、**そもそも update 機能が動かない**

### 当面の方針

**配布形式 = GH Releases (manual install) のみ** で当面 OK (auto-memory `project_arcagate_distribution.md` 準拠)。`tauri.conf.json` の `dialog: false` + `endpoints` は設定済だが、updater の実動作は無効化扱い。

### user 作業手順書

**→ [`docs/l1_requirements/distribution/pubkey-procedure.md`](../distribution/pubkey-procedure.md)**

そこに以下を網羅した手順書 + security 分析:

- なぜ要るのか (threat model)
- 鍵の役割 (公開鍵 = 公開可 / 秘密鍵 = 絶対秘匿)
- セキュリティ要件 (置き場所 NG / 推奨)
- agent (Claude Code 含む) を触らせない理由 + concrete threat
- 手順 A-E (鍵生成 / 公開鍵 commit / GH Actions secret / signing 確認 / 動作検証)
- 漏洩時のリカバリ (rotation 手順、revocation の限界)
- agent 代行可能 / user 必須 作業の一覧表

### deferred ステータス確認方法

`bash scripts/release-checks/check-pubkey.sh` で WARN が出る → deferred 状態。
release tag push 時 (`IS_RELEASE_TAG=1`) に exit 1 になるよう gate 化済。

---

## F-MSStore. Microsoft Store 提出 (deferred、$0、user 4 step)

### 状態

R10-Y で agent 配置完了:

- `src-tauri/tauri.microsoftstore.conf.json` overlay (`webviewInstallMode: offlineInstaller`)
- `.github/workflows/release-msstore.yml` (manual trigger build + cosign signing)
- `docs/l1_requirements/distribution/microsoft-store.md` 手順書

残りは user 4 step (agent 代行不可、すべて Microsoft 側 GUI):

1. MSA 作成 / 利用 (https://account.microsoft.com/)
2. https://storedeveloper.microsoft.com/ で free Partner Center 個人開発者登録 ($0、政府 ID + selfie)
3. App name 予約 → Publisher CN 取得 → agent が `bundle.publisher` 反映 PR 起票
4. Store 提出 GUI (artifact upload + metadata)、review 1-3 営業日

### 詳細

→ [`docs/l1_requirements/distribution/microsoft-store.md`](../distribution/microsoft-store.md)

---

## F2. Authenticode code signing (deferred)

### 現状

未署名で配布 (CLAUDE.md / project_arcagate_distribution.md 方針)。SmartScreen 警告は仕様。

### user が行う作業 (有償 cert 取得)

- OV / EV コード署名証明書 (Sectigo / DigiCert / Azure Trusted Signing 等) を別途購入
- `WINDOWS_CERTIFICATE` (PFX base64) と `WINDOWS_CERTIFICATE_PASSWORD` を GitHub Actions secret に設定
- `release.yml` の sign-windows.ps1 step が secret 検出時のみ動作 (現実装で fallback 安全)

### release notes での扱い

README.md / docs/SUPPORT.md に SmartScreen 警告対処を記載済 (R4-A)。

---

## C2 / C3 / D1-D9 perf 計測 (agent 自動可能、user 確認不要)

agent dev 環境で `pnpm tauri build` 後に `scripts/release-checks/measure-startup.ps1` /
`measure-memory-soak.ps1` を run、結果を `docs/l1_requirements/release-readiness/measurements/`
に commit。R4-D で実施。

**user 操作不要**、agent が完結する。

---

## C7 DB 破損時 fallback dialog (R5 で実装検討)

agent が DB 破壊 → 起動 → recovery dialog 確認 まで自動化可能。dialog 実装の有無を確認、
無ければ R5 で fallback UI 追加する。

**user 操作不要**、agent が完結する。

---

## G3 WCAG color contrast numeric (R5 で自動化)

ax DevTools / Lighthouse の CLI 版で agent が numeric score 取得可能。R5 で `scripts/release-checks/check-contrast.sh` を追加予定。

**user 操作不要**、agent が完結する。

---

## G5 screen reader (NVDA / Narrator) (user 環境限定、deferred)

NVDA / Narrator の起動と screen reader output 検証は **user 環境のみで可能** (CI runner / agent dev では検証不可、TTS engine 必要)。

### release notes での扱い

README / SUPPORT に「screen reader 部分対応、L4 で改善」明記済。release blocker から外す。

---

## F8 uninstall flow (user 環境のみ検証可能)

MSI / NSIS の uninstaller は build に組み込み済 (Tauri 標準)。動作確認は **user 環境のインストール → アンインストール** で検証する必要があり、CI runner では再現困難。

### release notes での扱い

deferred、user 環境で初回 release 後の検証として記録。
