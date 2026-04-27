# Arcagate インストールガイド

Windows 10 (22H2 以降) / Windows 11 専用。

## 1. インストーラー入手

GitHub Releases から最新版をダウンロード:

- https://github.com/emanon-i/arcagate/releases/latest

形式は 2 種類:

- **`Arcagate_<version>_x64-setup.exe`** (NSIS、推奨。自動アップデート対応)
- **`Arcagate_<version>_x64_en-US.msi`** (MSI、企業 GPO 配布向け)

## 2. SmartScreen 警告対処

未署名 / 新規証明書のうちは Windows SmartScreen が警告を出すことがある:

1. 「WindowsによってPCが保護されました」ダイアログが出たら **「詳細情報」** をクリック
2. **「実行」** ボタンが現れるのでクリック

EV コード署名証明書での署名後は警告が即時消える (PH-441 batch-97 で署名 infra 整備済)。

## 3. 署名検証 (任意)

PowerShell で署名検証:

```powershell
Get-AuthenticodeSignature "Arcagate_<version>_x64-setup.exe"
```

`Status: Valid` + `SignerCertificate.Subject` が想定の発行者ならOK。

## 4. 必要ランタイム

- **Microsoft Edge WebView2 Runtime** (Windows 11 にはプリインストール済、Windows 10 22H2 はインストーラ同梱)
- 別途インストールが必要なら: https://developer.microsoft.com/microsoft-edge/webview2/

## 5. 自動アップデート

起動後、Settings > 一般 > アップデート で:

- 「アップデート確認」ボタン → GitHub Releases から最新版チェック
- 利用可能なら「適用」ボタン → ダウンロード + 自動再起動

将来的に 24h 間隔の自動チェックに対応予定 (batch-101)。

## 6. アンインストール

Windows Settings > Apps > Arcagate > Uninstall。
データは `%APPDATA%/com.arcagate.desktop/` に残る (手動削除可)。
