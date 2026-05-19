# Auto Update

> cross-cutting / Release 運用詳細は [`../../../l1_requirements/operations.md`](../../../l1_requirements/operations.md) Part 2

## 目的

GitHub Releases 経由でアプリを自動更新する仕組み。署名検証で更新元の完全性を保証する。

## やること (必要処理)

- `tauri-plugin-updater` で GitHub Releases から新版を確認 (Settings の About / `cmd_check_for_updates`)
- 更新がある場合は changelog を表示し install
- 更新バイナリの署名を minisign / Ed25519 で検証
- 問題 release は GitHub Releases 側で降格 (rollback)

## やらないこと (禁止 / scope 外)

- 署名検証を無効化しない (Tauri updater 仕様上も無効化不可)
- 秘密鍵を repo / バイナリに含めない (公開鍵のみ埋込)
- 自動ダウンロード後の無確認インストールをしない (user の install 操作を経る)
- cloud / 独自サーバ配信をしない (GitHub Releases のみ)

## 性能予算

- 更新確認は起動経路を block しない (About ペインでの明示操作 or 起動後の非同期確認)

## 副作用 (state 変化 / persistence)

- 更新適用でアプリバイナリを置換、再起動
- 起動時に `disabled.json` を fetch して降格版を判定 (kill switch)

## 依存

- plugin: `tauri-plugin-updater`
- 配布: GitHub Releases、`release.yml` (tauri signer = Tier 1 / cosign = Tier 2)
- 設定: `src-tauri/tauri.conf.json` の `plugins.updater.pubkey`

## 既知の判断

- 鍵運用 (pubkey 公開 / private key 秘匿) と rollback / cosign 手順は operations.md Part 2 が規範
- 署名検証なしの auto-update は任意コード実行に直結するため、検証は必須契約
