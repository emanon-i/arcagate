# Arcagate リリース手順 (メンテナ向け)

## 前提

- GitHub Releases に push 権限
- (推奨) Authenticode コード署名証明書 + GitHub secrets 設定:
  - `WINDOWS_CERTIFICATE` (PFX base64)
  - `WINDOWS_CERTIFICATE_PASSWORD`
- (推奨) tauri-plugin-updater 署名鍵 + secrets:
  - `TAURI_SIGNING_PRIVATE_KEY`
  - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

## 手順

### 1. version bump

```bash
# Cargo.toml + tauri.conf.json + package.json (あれば) の version 同期
# 例: 0.1.0 → 0.2.0
```

`pnpm verify` 全通過確認。

### 2. tag push

```bash
git tag -a v0.2.0 -m "Release v0.2.0"
git push origin v0.2.0
```

→ `.github/workflows/release.yml` (PH-447 batch-100 新設) が自動発火:

1. pnpm tauri build (Windows release バイナリ + msi/nsis)
2. (証明書 secret あれば) `scripts/sign-windows.ps1` で Authenticode 署名
3. tauri signer sign で .sig 生成 (updater 用)
4. latest.json 自動生成
5. `gh release create --draft` で draft Release + bundle / latest.json 添付

### 3. Release 公開

GitHub Web UI で draft Release を確認 → Edit → Publish。

公開後:

- 既存ユーザの Updater UI (Settings > 一般 > アップデート確認) で新バージョンが表示される
- SmartScreen reputation は EV 証明書なら即時、それ以外は accumulate 期間あり

## 鍵管理

### Authenticode 証明書

OV / EV / Azure Code Signing から選択:

- EV: 即時 SmartScreen 有効、年 $300-500
- OV: reputation accumulate 必要、年 $100-200
- Azure Code Signing: $9.99/月、Microsoft Trusted Signing

PFX ファイルを base64 化して GitHub Secret に登録:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("cert.pfx")) | clip
```

### tauri-plugin-updater 署名鍵

```bash
npm run tauri signer generate -- -w ~/.tauri/arcagate.key
```

公開鍵 (`pub.key`) を `tauri.conf.json` の `plugins.updater.pubkey` に embed。
秘密鍵を GitHub Secret `TAURI_SIGNING_PRIVATE_KEY` に登録。

## ロールバック

問題発生時:

1. GitHub Releases で当該 release を「Pre-release」or「Draft」に戻す
2. 1 つ前の release を最新に降格 (tag 操作)
3. ユーザは Updater UI で新バージョン表示なし = 自動 downgrade されない (security 上正しい挙動)

緊急ロールバック plan は別途 batch-101 以降で SOP 化予定。

## SBOM (Software Bill of Materials)

batch-101 で実装予定。CycloneDX format で Rust + npm 依存を Release assets に同梱。
