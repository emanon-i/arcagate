# Arcagate

PC上に散在する起動元を一箇所に集約する個人用コマンドパレット型コントロールパネル（Tauri v2 + SvelteKit + Rust + SQLite）。

## 必ず読むドキュメント

セッション開始時に以下を読んでから作業を始める:

| ドキュメント                                                           | 役割                                                                  |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `docs/dispatch-operation.md`                                           | 運用フロー（バッチ設計・Plan 実行・コミット規約）                     |
| `docs/l0_ideas/arcagate-engineering-principles.md`                     | 技術判断基準（フロント/バック分担・テスト・依存予算・リファクタ閾値） |
| `docs/l0_ideas/arcagate-concept.md` / `docs/l1_requirements/vision.md` | プロダクト概念 / 要件                                                 |
| `docs/l1_requirements/ux_standards.md` 等                              | デザイン / UX 標準                                                    |
| `docs/dispatch-log.md`                                                 | 実行ログ（最新 30 行 + 手動確認依頼セクション）                       |

## 行動規範

### ワークフロー

- 3ステップ以上またはアーキテクチャに関わるタスクは必ずPlanモードで開始する
- 途中でうまくいかなくなったら、無理に進めずすぐに立ち止まって再計画する
- 構築だけでなく、検証ステップにもPlanモードを使う
- 実装前に詳細な仕様を書き、曖昧さを減らす

### サブエージェント活用

- メインのコンテキストウィンドウをクリーンに保つためにサブエージェントを積極的に使う
- リサーチ・調査・並列分析はサブエージェントに任せる
- 1サブエージェント＝1タスクで集中させる

### 自己改善

- ユーザーから修正を受けたら必ず `docs/lessons.md` にそのパターンを記録する
- 同じミスを繰り返さないよう自分へのルールを書き、ミス率が下がるまで改善し続ける
- セッション開始時に関連する lessons をレビューする
- `/simplify` 実行時は `docs/l0_ideas/arcagate-engineering-principles.md` を参照し、技術判断基準に照らして指摘を取捨選択する

### 完了基準

- 動作を証明できるまでタスクを完了としない
- テスト実行・ログ確認・差分確認で正しさを示す
- 「スタッフエンジニアはこれを承認するか？」と自問する

### コア原則

- シンプル第一: 変更は最小限に。影響するコードを絞る
- 手を抜かない: 根本原因を見つける。一時的な修正は避ける
- 影響を最小化: 必要な箇所のみ変更し、バグを引き込まない
- エレガントさの追求: 重要な変更には「もっと良い方法はないか？」と立ち止まる。ただし単純な修正には過剰設計しない

### 自律性

- バグレポートを受けたら質問せずにそのまま修正する
- ログ・エラー・失敗テストを自分で見て解決する
- 失敗しているCIテストは言われなくても修正しに行く

## プロジェクトの暗黙知

### 設計方針・依存ルール

- レイヤー依存は一方向: `commands/` → `services/` → `repositories/` → DB。逆方向禁止
- Service Layer が全エントリーポイント（UI / CLI）の共通経路。Repository を直接呼ばない
- Repository 間の相互参照禁止。複数 Repository の結合は Service で行う

### やってはいけないこと

- `src/lib/components/ui/` の手動編集は原則禁止（shadcn-svelte scaffold 出力。lint/format 除外済み）。
  ビルドエラー・型エラーの修正は例外とし、L3 ドキュメントに記録する
- `status: done` の L1/L2 ドキュメント書き換え（明示的な改訂プロセスを経る）
- ORM（diesel, sqlx, sea-orm）の導入。rusqlite + 生SQL が意図的な選択

### 意図的な設計判断

- `Mutex<Connection>` による単一DB接続: WAL モードで読み取り並行性を確保。個人アプリにプールは過剰
- UUID v7（TEXT型）を全PKに使用: 時刻ソート可能 + インポート時の衝突回避
- `include_str!` でマイグレーションSQLをバイナリに埋め込み。実行時の外部ファイル依存なし
- `AppError` は `Serialize` で文字列化してフロントエンドへ返す。JSON構造体ではなくプレーン文字列

### エラーハンドリング

- 統一エラー型 `AppError`（`thiserror`）を全レイヤーで使用。`anyhow` や `Box<dyn Error>` は不使用
- IPC: `Result<T, AppError>` → Tauri が自動シリアライズ → フロントエンドは文字列として受信

### コマンド

- `pnpm verify` — 全検証（biome lint, dprint fmt, clippy, rustfmt, svelte-check, cargo test, smoke-test, vitest, tauri build）
- `pnpm tauri dev` — 開発起動（verify に含まれない。動作確認時に使用）
- `pnpm test:e2e` — Playwright E2E テスト（Tauri 統合・CDP 経由）

### CIとローカルの差

- `lefthook`（pre-commit）: ステージングファイルのみ対象（biome, dprint, clippy, rustfmt）
- CI（GitHub Actions）: 全ファイル対象 + svelte-check + cargo test + tauri build。CIが真の品質ゲート
