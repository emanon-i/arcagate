# User-Action-Needed Items

agent では完結できず **user の物理アクション / 課金 / 環境固有検証** が必要な項目を分離。
agent 側は本 doc を更新し、scope の境界を明示する。

## B-1. updater pubkey 設定 (deferred、release blocker 降格)

### 現状

`src-tauri/tauri.conf.json` の `bundle.updater.pubkey` が:

```
"PLACEHOLDER_REGENERATE_WITH_TAURI_SIGNER"
```

### 影響

- updater 経路で signature 検証が成立しない
- 本物の signed update も検証失敗で reject される
- 偽 update も技術的には reject されるが、**そもそも update 機能が動かない**

### 当面の方針

**配布形式 = GH Releases (manual install) のみ** で当面 OK (auto-memory `project_arcagate_distribution.md` 準拠)。`tauri.conf.json` の `dialog: false` + `endpoints` は設定済だが、updater の実動作は無効化扱い。

### user が行う作業 (release で auto-update を有効化したくなったら)

1. `tauri signer generate -w arcagate.key` で keypair 生成
2. 出力された **public key** (untrusted comment + base64) を `tauri.conf.json` の `bundle.updater.pubkey` に commit
3. 出力された **private key** を GitHub Actions secret `TAURI_SIGNING_PRIVATE_KEY` に設定 (パスフレーズあれば `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` も)
4. private key file 自体は **絶対に repo にコミットしない**、安全な場所に backup
5. `release.yml` の `tauri signer sign` step が動作することを test build で確認
6. release tag push 時に CI が `IS_RELEASE_TAG=1` で `check-pubkey.sh` を強制 fail させる仕組みを有効化 (本 doc / `check-pubkey.sh` で言及済)

### deferred ステータス確認方法

`bash scripts/release-checks/check-pubkey.sh` で WARN が出る → deferred 状態。
release tag push 時 (`IS_RELEASE_TAG=1`) に exit 1 になるよう gate 化済。

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
