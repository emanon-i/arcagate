# Foundation §1: 技術スタック

[foundation.md](./foundation.md) の §1 詳細。Tauri / Rust / TypeScript / SvelteKit / SQLite stack の選定理由と version 制約。

---
status: done
---

# Arcagate システム構成

## 1. 技術スタック

### 1.1 デスクトップフレームワーク

| 項目           | 選定                         |
| -------------- | ---------------------------- |
| フレームワーク | **Tauri v2** (latest stable) |

**選定理由**:

- v1はメンテナンスモード（セキュリティ修正のみ）。新規プロジェクトでv1を選ぶ理由がない
- プラグインAPI: コア機能自体がプラグインとして実装されており、Arcagateの「全機能はプラグイン」思想と合致
- IPC: カスタムプロトコル（HTTP-like）でv1より高速。バイナリペイロード対応
- パーミッションモデル: 細粒度のcapabilities/scopes

**不採用**: Tauri v1（メンテナンスモード、技術的負債になる）

#### Tauri v2 プラグイン一覧（M1で使用）

| プラグイン                     | 用途                                     |
| ------------------------------ | ---------------------------------------- |
| `tauri-plugin-global-shortcut` | グローバルホットキー                     |
| tray-icon (built-in feature)   | システムトレイ常駐                       |
| `tauri-plugin-dialog`          | ファイル選択ダイアログ（アイテム登録時） |
| `tauri-plugin-shell`           | 外部プロセス起動                         |
| `tauri-plugin-autostart`       | Windows起動時の自動起動                  |
| `tauri-plugin-fs`              | ファイルシステムアクセス（D&D等）        |

### 1.2 フロントエンド

| 項目                 | 選定                                                             |
| -------------------- | ---------------------------------------------------------------- |
| フレームワーク       | **SvelteKit** + `@sveltejs/adapter-static` (**Svelte 5**, runes) |
| CSS                  | **Tailwind CSS v4**                                              |
| UIコンポーネント     | **shadcn-svelte** (Svelte 5 + Tailwind v4 対応版)                |
| 状態管理             | Svelte 5 runes ($state, $derived) — 外部ライブラリ不要           |
| パッケージマネージャ | **pnpm**                                                         |

**SvelteKit + adapter-static の選定理由**:

- SPA出力（index.html + JS/CSS）。SSRサーバー不要。Tauri v2公式サポート
- ファイルベースルーティング: M2bのワークスペースページ追加時にルーター手動設定が不要
- レイアウト・エラーバウンダリ等の開発体験が標準で利用可能

**Svelte 5 の選定理由**:

- runes ($state, $derived, $effect) による明示的なリアクティビティ。Svelte 4の暗黙的リアクティビティより予測しやすい
- パフォーマンス: ゼロから書き直されたランタイム。バンドルサイズ削減
- エコシステム全体がSvelte 5に移行済み（shadcn-svelte, Bits UI等）

**shadcn-svelte の選定理由**:

- コード所有型: プロジェクトにコピーされるため、外部ランタイム依存なし。自由に改変可能
- Bits UIベース: アクセシブルなヘッドレスプリミティブの上にプリスタイルを提供
- `Command` コンポーネント: cmdk パターンのコマンドパレットが標準提供。Arcagateのコア UI に直結
- CSS変数ベースのテーマ: M2bのカスタムテーマ機能への拡張パスがある

**Tailwind CSS v4 の選定理由**:

- shadcn-svelte がネイティブサポート
- CSS-first config（tailwind.config.js 不要）、Lightning CSSエンジン
- 最大のエコシステム・ドキュメント

**不採用**:

- plain Svelte + Vite: SPA出力のTauri公式サポート・HMR・ファイルベースルーティングによるM2bページ追加の容易さを欠く
- Svelte 4: Svelte 5がstable。greenfieldで旧版を選ぶ理由なし
- Skeleton UI: コマンドパレット向けコンポーネントが弱い
- Bits UIのみ: 全コンポーネントのスタイリングをゼロから書く必要があり、個人プロジェクトには高コスト

### 1.3 バックエンド

| 項目               | 選定                             |
| ------------------ | -------------------------------- |
| 言語               | **Rust** (stable toolchain)      |
| SQLiteアクセス     | **rusqlite** (`bundled` feature) |
| マイグレーション   | **rusqlite_migration**           |
| ID生成             | **UUID v7** (`uuid` crate)       |
| エラー型導出       | **thiserror**                    |
| パスワードハッシュ | **argon2**                       |

**rusqlite の選定理由**:

- SQLite専用の軽量ラッパー。マルチDB抽象のオーバーヘッドなし
- sync API: Tauriのコマンドはスレッドプールで実行されるため、blocking SQLite呼び出しでUIをブロックしない
- `bundled` feature: SQLiteをバイナリに直接コンパイル。システム依存ゼロ、一貫した動作を保証
- 個人プロジェクトの単純なクエリに対して、生SQLが最も透明でデバッグしやすい

**rusqlite_migration の選定理由**:

- SQLiteの `user_version` pragma を利用（追加テーブル不要）
- SQLファイルを `include_str!` でバイナリに埋め込み。外部ファイル依存なし、CLI不要

**UUID v7 の選定理由**:

- 時刻ソート可能（タイムスタンプベース）
- グローバルに一意（エクスポート/インポート時の衝突回避）
- auto-increment と異なり、外部からIDを推測しにくい

**不採用**:

- sqlx: マルチDB抽象がSQLite専用プロジェクトに過剰。async不要。コンパイル時SQLチェックにはDB接続かsqlx-data.json管理が必要
- diesel: マクロシステムが重い、diesel CLI必要、スキーマDSLの学習コスト。個人ランチャーには過剰
- sea-orm: sqlx上のORM。asyncレイヤー＋ORMレイヤーの二重オーバーヘッド

### 1.4 テスト

| レイヤー                    | ツール                             | タイミング                    |
| --------------------------- | ---------------------------------- | ----------------------------- |
| Rust ユニットテスト         | `cargo test`                       | M1（service + repository層）  |
| Svelte コンポーネントテスト | vitest + `@testing-library/svelte` | M1（重要コンポーネントのみ）  |
| Tauri コマンド統合          | `cargo test` + テストヘルパー      | M1                            |
| E2E（デスクトップ）         | **Playwright**（CDP/WebView2）     | PH-003-F 完了・11テスト全PASS |

**Playwright の選定理由（E2E）**:

- Tauri v2 + WebView2 環境では `--remote-debugging-port=9515` で CDP 接続可能
- `playwright-chromium` が WebView2 の DevTools Protocol に接続し、ページ操作・DOM 検査・スクリーンショットを利用できる
- WebdriverIO（旧来の推奨）は Tauri v2 向けセットアップが複雑。CDP 経由の Playwright が実質的な選択

**不採用**: WebdriverIO（Tauri v2 向けセットアップが煩雑。CDP経由Playwrightで代替）
