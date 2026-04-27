# Arcagate プライバシーポリシー

最終更新: 2026-04-27 (PH-467 batch-105)

## 概要

Arcagate は **個人用デスクトップランチャー** で、デフォルトでは **一切のデータを外部送信しない**。すべてのアイテム / ワークスペース / 設定 / クリップボード履歴 / メモは local SQLite に保存される。

## 送信データ (Opt-in 時のみ)

将来的に Settings > データ で **Opt-in トグル**を設けて以下を送信予定 (PH-465 Telemetry / PH-466 Crash 監視):

### 1. 匿名 Telemetry (PH-465、未実装、デフォルト OFF)

- バージョン文字列 (例: `0.2.0`)
- Windows ビルド (例: `Windows 11 22H2`)
- アーキテクチャ (`x86_64`)
- WebView2 ランタイム version
- 重要操作カウント (launch / palette open / search の **件数のみ**)
- AppError code 別発生回数 (例: `launch.file_not_found: 3`)

**送信されない**:

- 個別アイテム名 / path / クエリ内容
- ユーザ識別子 (UUID 含む)
- IP / 位置情報
- スクリーンショット / ログ生データ

### 2. Crash 報告 (PH-466、未実装、デフォルト OFF)

- 未補捉 panic / Promise reject の stack trace
- 当時のアプリ version + Windows ビルド
- redact 後の file path (例: `C:/Users/<user>/AppData/...` → `<APPDATA>/...`)

**送信されない**:

- DB 内容 (アイテム / タグ / 履歴)
- 設定値 (テーマ / hotkey / 背景画像 path 等)
- フォーカス中の操作内容

## kill-switch (PH-468、未実装)

緊急時、サーバ側 `disabled.json` を起動時に fetch する設計:

- fetch URL: `https://github.com/emanon-i/arcagate/releases/latest/download/disabled.json`
- 送信される情報: なし (HTTP GET のみ、IP は GitHub のログに残る)
- ユーザを識別する情報は一切送信しない

Settings で「サーバチェックを無効化」できる (デフォルト ON)。

## サードパーティ依存

- **Microsoft Edge WebView2**: Microsoft の規約に従う
- **Tauri framework**: ローカル動作のみ、Tauri 自身は外部送信しない
- **GitHub Releases (Updater)**: アップデート確認時に GitHub と通信、IP のみログ記録 (GitHub の Privacy Policy 適用)

## データ削除

- アイテム削除: Library で個別削除、または `bulk_delete_items` で一括
- 全データ削除: `%APPDATA%/com.arcagate.desktop/` フォルダ削除
- アンインストール: Windows Settings > Apps > Arcagate > Uninstall (DB は手動削除要)

## 連絡先

問い合わせ / プライバシー違反報告: GitHub Issues

- https://github.com/emanon-i/arcagate/issues

## 変更履歴

- 2026-04-27: 初版 (PH-467 batch-105)、Opt-in モデル明記 + 送信外データ列挙
