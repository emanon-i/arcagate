# Arcagate

PC上に散在する起動元（Steam、各種ランチャー、ブラウザ、スクリプト）を一箇所に集約する個人用コントロールパネル。コマンドパレット中心の軽量常駐アプリで、ワークスペース・ファイル管理・MCP連携へ段階的に拡張予定。

- 技術スタック: Tauri + Svelte（UI）+ Rust（バックエンド）+ SQLite（ローカルDB）
- 個人用途・ゼロコスト運用（OSS・無料サービスのみ）

## フォルダ構造

```
arcagate/
├── docs/                          — Tri-SSD仕様ドキュメント群
│   ├── l0_ideas/
│   │   └── arcagate-concept.md    — コンセプト（課題・目的・ユースケース・技術スタック・マイルストーンM1〜M4・設計思想・競合分析）
│   ├── l1_requirements/
│   │   └── vision.md              — ビジョン・要求（ペルソナ・機能要求REQ-001〜013・非機能要求・制約条件）
│   ├── l2_foundation/
│   │   └── .gitkeep               — （未作成）システム構成ドキュメント用
│   └── l3_phases/
│       └── .gitkeep               — （未作成）フェーズ別実装仕様用
├── .gitignore                     — Tauri + Svelte + Rust + SQLite向けの除外設定
└── CLAUDE.md                      — このファイル
```

## Tri-SSD（三層仕様駆動開発）

AI/LLMコードエージェントを前提としたシンプルな仕様駆動開発フレームワーク。三層モデルを通じて、要件から実装までのトレーサビリティを確保する。

### レイヤー構成

| レイヤー | ディレクトリ | 役割 |
|---|---|---|
| L0 Ideas | `docs/l0_ideas/` | コンセプト・アイデアメモ（自由形式） |
| L1 Requirements | `docs/l1_requirements/` | ビジョン・要求定義（課題・ペルソナ・機能/非機能要求） |
| L2 Foundation | `docs/l2_foundation/` | システム構成（技術スタック詳細・アーキテクチャ・DB設計） |
| L3 Phases | `docs/l3_phases/` | フェーズ別実装仕様（機能単位の詳細仕様・受け入れ条件） |

### 主なスキルコマンド

| コマンド | 説明 |
|---|---|
| `/tri-ssd:tri-ssd-orchestrator` | ワークフロー全体を統括するオーケストレータ |
| `/tri-ssd:status` | ドキュメントの進捗状況を確認 |
| `/tri-ssd:gen-l1` | L1（要件）ドキュメントを生成 |
| `/tri-ssd:gen-l2` | L2（システム構成）ドキュメントを生成 |
| `/tri-ssd:gen-l3` | L3（フェーズ別仕様）を生成 |
| `/tri-ssd:gen-code` | L3フェーズからコードとテストを生成 |
| `/tri-ssd:split-l3` | L3フェーズをフォルダ構造に分割 |
| `/tri-ssd:merge-l3` | 分離されたL3フェーズを1ファイルに統合 |
| `/tri-ssd:done` | ドキュメントを完了にマーク |
