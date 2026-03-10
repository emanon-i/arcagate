---
name: arcagate
description: Arcagate CLI でアイテム・ワークスペースを操作する
user_invocable: false
---

# Arcagate CLI Skill

Arcagate はデスクトップアプリ（コマンドパレット型ランチャー）。CLI 経由で操作可能。

## DB パス

```
%APPDATA%\com.arcagate.desktop\arcagate.db
```

テスト時は `--db <path>` で一時 DB を指定する。

## コマンド一覧

### アイテム操作

```bash
# 全件取得
arcagate list [--json]

# 検索（部分一致）
arcagate search <query> [--json]

# 起動（完全一致優先、部分一致フォールバック）
arcagate run <name> [--dry-run]

# 作成（位置引数）
arcagate create <item_type> <label> <target> [--json] [--dry-run]
# item_type: exe|url|folder|script|command

# 作成（JSON 入力）
arcagate create --json-input '{"item_type":"url","label":"Google","target":"https://google.com"}' [--json] [--dry-run]

# 部分更新（JSON で変更フィールドのみ指定）
arcagate update <id> --json-input '{"label":"New Name"}' [--json] [--dry-run]

# 削除
arcagate delete <id> [--json]
```

### 起動履歴

```bash
# 最近起動したアイテム
arcagate recent [--limit N] [--json]

# 頻度順アイテム
arcagate frequent [--limit N] [--json]
```

### 設定

```bash
arcagate config get <key> [--json]
arcagate config set <key> <value> [--json]
```

### エクスポート/インポート

```bash
arcagate export <path>
arcagate import <path> [--dry-run]
```

### ワークスペース操作

```bash
arcagate workspace list [--json]
arcagate workspace create <name> [--json]
arcagate workspace add-widget <workspace_id> <widget_type> [--json]
# widget_type: favorites|recent|projects|watched_folders
arcagate workspace delete <id> [--json]
arcagate workspace list-widgets <workspace_id> [--json]
arcagate workspace update-widget <id> --json-input '{"position_x":0,"position_y":1,"width":6,"height":4}' [--json]
arcagate workspace remove-widget <id> [--json]
```

### スキーマ内省

```bash
# 全コマンド一覧
arcagate describe [--json]

# 特定コマンドのパラメータ・型・enum値
arcagate describe create [--json]
```

## エージェント向けルール

1. **破壊的操作の前に `--dry-run`**: `run`, `create`, `update`, `import` を実行する前に `--dry-run` で検証する
2. **不明な引数は `describe` で確認**: `arcagate describe <command> --json` でパラメータを確認する
3. **出力は `--json` で取得**: 後続処理に使う場合は必ず `--json` フラグを付ける
4. **入力ハードニング**: label/target に制御文字を含めない。exe/folder/script の target に `..` を含めない
5. **削除は慎重に**: `delete` / `workspace delete` は取り消せない。事前にユーザー確認を推奨
