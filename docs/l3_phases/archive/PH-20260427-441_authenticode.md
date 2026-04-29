---
id: PH-20260427-441
status: done
batch: 97
type: 改善
era: Distribution Era
---

# PH-441: Authenticode コード署名パイプライン (Codex Q4 #1)

## 問題

Codex 3 回目 Q3/Q4: Windows 配布で SmartScreen / UAC 体験に直結、署名は最優先。
現状 unsigned exe → 「不明な発行元」警告 → 配布初動で離脱。

## 改修

### 署名手段の選択

3 オプション:

1. **EV コード署名証明書 (商用)**: Sectigo / DigiCert で年間 $300-500、SmartScreen 即時有効
2. **OV コード署名証明書 (商用)**: 年間 $100-200、SmartScreen は accumulate reputation 必要
3. **Azure Code Signing (相対的安価)**: $9.99/月、Microsoft Trusted Signing

batch-97 では:

- 即実装: Tauri 設定 + signtool ベースの署名スクリプト整備 (証明書ファイル切替可能)
- 証明書取得は別途ユーザ判断 (本 plan は署名 infra 整備に集中)

### 実装

- `src-tauri/tauri.conf.json` の `bundle.windows.certificateThumbprint` 設定
- 環境変数 `ARCAGATE_CERT_THUMBPRINT` (or `WINDOWS_CERTIFICATE` for cert file) で CI から渡す
- `scripts/sign-windows.ps1` 新設 (post-build hook 用):
  - signtool sign /tr <timestamp_url> /td sha256 /fd sha256 /a target/release/arcagate.exe
  - bundle (msi / nsis) も sign
- README に署名手順 + 証明書取得方法 hint
- `.github/workflows/ci.yml` に署名検証ステップ (証明書なし環境ではスキップ)

### 受け入れ条件

- [ ] tauri.conf.json に署名設定追加 (env で thumbprint 指定可能)
- [ ] scripts/sign-windows.ps1 新設
- [ ] README に署名手順 + 取得方法
- [ ] CI に署名検証 (optional、証明書ありなら verify)
- [ ] `pnpm verify` 全通過 (証明書なしでも build 通る形)

### 別 plan に切り出し

- 実証明書での署名実行 → ユーザ証明書取得後
- Microsoft Defender SmartScreen reputation 蓄積戦略
