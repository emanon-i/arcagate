---
id: PH-20260427-447
status: done
batch: 100
type: 改善
era: Distribution Era
---

# PH-447: GitHub Releases 自動投稿 workflow (Updater 用 latest.json)

## 問題

PH-442 で tauri-plugin-updater plugin 統合、PH-446 で UI、本 plan で latest.json サーバ整備。

## 改修

`.github/workflows/release.yml` 新設:

- tag push (`v*.*.*`) でトリガ
- pnpm tauri build
- scripts/sign-windows.ps1 (証明書 secret あれば署名)
- tauri signer sign で .sig 生成
- gh release create + bundle 添付 (msi / nsis exe)
- latest.json 自動生成 + Release assets に追加

## 受け入れ条件

- [ ] .github/workflows/release.yml 新設
- [ ] tag push トリガ + tauri build + sign + release
- [ ] latest.json 自動生成 (version / pub_date / signature / url)
- [ ] README に release 手順追記
- [ ] `pnpm verify` 全通過
