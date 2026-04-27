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

## 開発

```bash
# 依存インストール
pnpm install

# 開発起動
pnpm tauri dev

# 全検証
pnpm verify

# E2E テスト（Playwright + WebView2 CDP）
pnpm test:e2e
```

詳細は [`docs/`](docs/) を参照:

- [`docs/l0_ideas/arcagate-engineering-principles.md`](docs/l0_ideas/arcagate-engineering-principles.md) — 技術判断基準
- [`docs/dispatch-operation.md`](docs/dispatch-operation.md) — 開発フロー
- [`docs/lessons.md`](docs/lessons.md) — 過去の落とし穴と教訓

## アーキテクチャ

- **Frontend**: SvelteKit (Svelte 5 runes) + Tailwind v4 + shadcn-svelte
- **Backend**: Rust + Tauri v2、`Mutex<Connection>` + WAL の単一 SQLite 接続
- **IPC**: `invoke` / `event` 両方、ts-rs で TypeScript bindings 自動生成
- **State**: Svelte 5 `$state` のみ（外部状態管理ライブラリは導入しない）

レイヤー依存は一方向: `commands → services → repositories → DB`。詳細は [`docs/l2_architecture/folder-map.md`](docs/l2_architecture/folder-map.md)。

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

## ライセンス

[MIT](LICENSE)
