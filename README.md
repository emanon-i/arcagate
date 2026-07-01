# Arcagate

> PC 上に散在する起動元を集約する個人用コマンドパレット

Tauri v2 + SvelteKit + Rust + SQLite で実装された軽量デスクトップランチャー。
グローバルホットキーから 1 アクションでアプリ・URL・ファイル・スクリプトを起動できる。

[![CI](https://github.com/emanon-i/arcagate/actions/workflows/ci.yml/badge.svg)](https://github.com/emanon-i/arcagate/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 何ができる

- **コマンドパレット** — グローバルホットキー（デフォルト `Ctrl+Shift+Space`）でフロート起動、検索 → Enter で即実行
- **Workspace** — よく使うものを並べた 1 クリック起動パッド（時計 / クリップボード履歴 / プロジェクト一覧 / ファイル検索 等のウィジェット）
- **Library** — アイテム一覧、タグ分類、4:3 カード表示、背景画像 / focal point カスタマイズ
- **テーマ** — 組み込みテーマ + カスタムテーマ（CSS 変数エディタ + JSON import/export）

## 動作環境

- **Windows 11 64bit**（macOS / Linux はスコープ外）
- 配布形式: MSI / NSIS インストーラ

## インストール

[Releases](https://github.com/emanon-i/arcagate/releases) から最新版の `Arcagate_*_x64-setup.exe`（NSIS）または `Arcagate_*_x64_en-US.msi` をダウンロードしてインストール。

## 使い始める

1. アプリを起動（タスクトレイに常駐）
2. ホットキー `Ctrl+Shift+Space` でパレット起動
3. アイテムを Library から登録（D&D 対応）

## データ保存場所

Arcagate は以下のフォルダにデータを保存します。 すべて Windows 標準の user-scope 領域で、 admin 権限不要 / 他 user とは隔離されます。 実 path は **Settings → About → 「データの保存場所」** で確認可能、 各行の **「フォルダを開く」** ボタンで Explorer から開けます。

| 種別           | path (Windows 標準)                                     |
| -------------- | ------------------------------------------------------- |
| データベース   | `%APPDATA%\com.arcagate.desktop\arcagate.db`            |
| アイコン cache | `%APPDATA%\com.arcagate.desktop\icons\`                 |
| 壁紙           | `%APPDATA%\com.arcagate.desktop\wallpapers\`            |
| image-scrap    | `%APPDATA%\com.arcagate.desktop\image-scraps\`          |
| ログ           | `%LOCALAPPDATA%\com.arcagate.desktop\logs\arcagate.log` |

**アンインストール時の手動掃除手順**: インストーラはアプリ本体のみ削除し、 上記の data フォルダは残します。 完全に消したい場合は以下を手動で削除してください:

- `%APPDATA%\com.arcagate.desktop\`
- `%LOCALAPPDATA%\com.arcagate.desktop\`

データの **export / import** は Settings → データ → 「Export」 で JSON 形式で書き出せます (items / tags / config が対象、 icons / wallpapers ファイル本体は別途手動コピーが必要)。

## 開発

```bash
# 依存インストール
pnpm install

# 開発起動（推奨：隔離版。本番データ %APPDATA%\com.arcagate.desktop\ と物理分離）
pnpm app:dev

# 非隔離版（本番 identity = 本番データを使う。daily-use 中は非推奨）
pnpm tauri dev

# 全検証（biome / dprint / clippy / rustfmt / svelte-check / cargo test）
pnpm verify

# E2E テスト（Playwright + WebView2 CDP）
pnpm test:e2e
```

詳細は [`docs/`](docs/) を参照:

- [`docs/l0_ideas/motivation.md`](docs/l0_ideas/motivation.md) — L0 製品要求 (なぜ作る / 何 / 誰 / Non-goals / 成功条件 / 制約 / 利用形態 / 失敗パターン)
- [`docs/l2_foundation/foundation.md`](docs/l2_foundation/foundation.md) — L2 全体アーキテクチャ (技術 stack / レイヤー / IPC / state / schema / 設計判断)
- [`docs/l2_foundation/screens/`](docs/l2_foundation/screens/) — 画面別機能カタログ (palette / library / workspace / settings / onboarding)
- [`docs/l2_foundation/lessons.md`](docs/l2_foundation/lessons.md) — 過去の落とし穴と教訓

## アーキテクチャ

- **Frontend**: SvelteKit (Svelte 5 runes) + Tailwind v4 + shadcn-svelte
- **Backend**: Rust + Tauri v2、`Mutex<Connection>` + WAL の単一 SQLite 接続
- **IPC**: `invoke` / `event` 両方、ts-rs で TypeScript bindings 自動生成
- **State**: Svelte 5 `$state` のみ（外部状態管理ライブラリは導入しない）

レイヤー依存は一方向: `commands → services → repositories → DB`。 詳細は [`docs/l2_foundation/foundation.md`](docs/l2_foundation/foundation.md) §8 (ディレクトリ構成) + §9 (設計判断)。

## 配布 (署名)

Windows 配布時の Authenticode 署名 (PH-441 batch-97):

```powershell
# 環境変数で証明書 Thumbprint を指定 (CurrentUser\My にインストール済)
$env:ARCAGATE_CERT_THUMBPRINT = "<sha1>"
pnpm tauri build
pwsh scripts/sign-windows.ps1
```

または PFX ファイル指定:

```powershell
$env:ARCAGATE_CERT_FILE = "C:/path/to/cert.pfx"
$env:ARCAGATE_CERT_PASSWORD = "<password>"
pwsh scripts/sign-windows.ps1
```

証明書は OV / EV コード署名証明書 (Sectigo / DigiCert / Azure Trusted Signing 等) を別途取得。
証明書なしビルドでも `sign-windows.ps1` は warning + skip するため CI 通過。

## プライバシー

[PRIVACY.md](PRIVACY.md) — デフォルトでは外部送信ゼロ、Telemetry / Crash 監視は将来 Opt-in で追加予定。

## サポート / バグ報告

### 報告経路

- **GitHub Issues**: [github.com/emanon-i/arcagate/issues](https://github.com/emanon-i/arcagate/issues) — bug / 機能要望
- **GitHub Discussions**: [github.com/emanon-i/arcagate/discussions](https://github.com/emanon-i/arcagate/discussions) — 質問 / ベストプラクティス共有

### 報告時に添えると対処が早い情報

- Arcagate のバージョン (Settings → About で確認)
- Windows のバージョン (例: Windows 11 23H2)
- 再現手順 (1, 2, 3... 形式)
- 期待した動作 / 実際の動作
- エラーメッセージ (toast の文言 or log file 該当行)
- screenshot / 録画

### log file

```
%LOCALAPPDATA%\com.arcagate.desktop\logs\arcagate.log
```

最新 5MB × 7 世代まで rotate 保持。 直近の `arcagate.log.0` を添付すると trace が早い。 path 全体は Settings → About の「データの保存場所」 で確認 + Explorer で開けます。

### SmartScreen / Defender 警告

当面は未署名で配布。 Win11 で installer 実行時に「Windows がコンピュータを保護しました」 dialog が出るので: 「詳細情報」 → 「実行」。 不審な場合は SHA256 を release page と照合してから実行を推奨。

### サポート対象

- Windows 11 64bit のみ。 macOS / Linux は scope 外
- 個人開発のため対応は best-effort、 SLA / 保証なし

### 関連

- Changelog: [CHANGELOG.md](CHANGELOG.md) — release ごとの差分 (Keep a Changelog 形式)
- 過去の落とし穴: [docs/l2_foundation/lessons.md](docs/l2_foundation/lessons.md)
- アーカイブ済 plan: [docs/l3_phases/_archive/](docs/l3_phases/_archive/)

## ライセンス

[MIT](LICENSE)
