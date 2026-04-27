---
id: PH-20260427-449
status: todo
batch: 98
type: 整理
era: Distribution Era
---

# PH-449: 配布 README 整備 (Distribution 全体まとめ)

## 問題

batch-97/98 で署名 / Updater / SBOM が揃った段階で、ユーザ配布向け README を整理。

## 改修

`README.md`:

- 「配布」セクション拡充
  - インストール手順 (msi / nsis exe どちらか選択)
  - 署名検証手順 (Get-AuthenticodeSignature .\arcagate.exe)
  - SmartScreen 警告対処 (詳細情報 → 実行)
  - 自動アップデート挙動説明
- 「リリース手順」セクション
  - tag push → workflow 自動実行 → release 投稿 → latest.json + SBOM 添付
  - 署名鍵 / 証明書管理の運用
- 「サポートポリシー」
  - サポート OS (Windows 10 22H2 以降 / Windows 11)
  - WebView2 ランタイム要件 (Edge Runtime)

別ファイル新設:

- `INSTALL.md` (詳細インストールガイド)
- `RELEASE.md` (メンテナ向けリリース手順)

## 受け入れ条件

- [ ] README.md 配布 section + リリース手順 + サポートポリシー
- [ ] INSTALL.md 新設
- [ ] RELEASE.md 新設
- [ ] `pnpm verify` 全通過 (docs only)
