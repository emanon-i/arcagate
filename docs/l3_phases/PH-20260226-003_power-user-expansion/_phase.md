---
status: wip
phase_id: PH-20260226-003
depends_on:
  - PH-20260226-002
---

# PH-20260226-003: パワーユーザー拡張（M2相当）

## 目的

CLI・ワークスペース・MCP連携により、単なるランチャーから「コントロールパネル」へ進化させる。パワーユーザー向けの操作強化と、AIからの操作インターフェースを確立する。

## Phase 1 からの引き継ぎ事項

本フェーズ着手時に以下を対応すること:

| 項目                                         | 備考                                                                                                                  |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| E2E テスト導入（WebdriverIO + tauri-driver） | L2 §1.4 で定義済み。Phase 1 では GUI E2E を行わず Service/Repository 層テスト + コンポーネントテストで代替した        |
| `tauri::test::mock_builder` の再評価         | Windows バグ ([tauri#14723](https://github.com/tauri-apps/tauri/issues/14723)) の解消状況を確認し、採用可否を判断する |
| 視覚回帰テスト（screenshot diff）の検討      | UI デザインが安定していれば導入を検討する                                                                             |

## サブフェーズ一覧

| サブフェーズ | 機能                                                          | 元機能ID              | 優先度 |
| ------------ | ------------------------------------------------------------- | --------------------- | ------ |
| PH-003-A     | CLI（run / list / search）                                    | F-20260226-012 (core) | 1      |
| PH-003-B     | カテゴリプレフィックス + 内蔵コマンド（電卓・クリップボード） | F-20260226-012 (rest) | 2      |
| PH-003-C     | MCP サーバー                                                  | F-20260226-015        | 3      |
| PH-003-D     | ファイルシステム監視・パス追跡                                | F-20260226-013        | 4      |
| PH-003-E     | ワークスペース（ページ + ウィジェット配置）                   | F-20260226-014 (core) | 5      |
| PH-003-F     | UI リデザイン + テーマ + Git ステータス                       | F-20260226-014 (ext)  | 6      |

## 横断アーキテクチャ決定

### CLI バイナリ（PH-003-A で確立）

**構造**:

```
src-tauri/
└── src/
    └── bin/
        └── arcagate_cli.rs   ← 新規（CLI + MCP 共用エントリ）
```

**方針**:

- `Cargo.toml` に `[[bin]] name = "arcagate_cli"` + `clap = { version = "4", features = ["derive"] }` を追加
- `arcagate_lib` の Service Layer を共用。CLI 側で `DbState(Mutex<Connection>)` を自前初期化
- DB パス: `%APPDATA%\com.arcagate.desktop\arcagate.db`（`--db <path>` フラグで上書き可）
- Tauri の `run()` は呼ばない（リンクはされるが未使用）

### MCP サーバー（PH-003-C で確立）

**起動方式**: `arcagate_cli mcp`（clap サブコマンド）→ stdio JSON-RPC ループ

**実装**: 外部 MCP クレート不使用。JSON-RPC 2.0 手実装

```
src-tauri/src/mcp/
├── mod.rs      ← サブコマンドエントリ
├── server.rs   ← stdin/stdout JSON-RPC ループ
└── tools.rs    ← 4ツール（Service Layer 経由）
```

## Exit Criteria

- CLIからアイテムの検索・起動ができる
- ワークスペースに2ページ以上を作成し、内蔵ウィジェットを配置して日常運用できる
- Claude CodeからMCP経由でアイテムの登録・起動・検索を操作できる
- ファイル監視がパス変更を検知し、ユーザーに通知できる

## DB マイグレーション計画

| ファイル                  | 追加テーブル                      | 追加フェーズ |
| ------------------------- | --------------------------------- | ------------ |
| `002_mcp_permissions.sql` | `mcp_permissions`                 | PH-003-C     |
| `003_watched_paths.sql`   | `watched_paths`                   | PH-003-D     |
| `004_workspaces.sql`      | `workspaces`, `workspace_widgets` | PH-003-E     |
| `005_themes.sql`          | `themes`                          | PH-003-F     |

## 参照ドキュメント

- L0 Concept: `docs/l0_ideas/arcagate-concept.md` §8 M2a/M2b/M2c
- L1 Requirements: `docs/l1_requirements/vision.md` §3（REQ-008〜011）
- L2 Foundation: `docs/l2_foundation/foundation.md` §2.3（Service Layer）, §2.4（Plugin Interface）, §2.5（IPC設計）
