---
status: pending
sub_phase: PH-003-F
feature_id: F-20260226-014
priority: 6
---

# PH-003-F: ワークスペース拡張（テーマ + Git ステータス表示）

**対応REQ**: REQ-20260226-010
**元機能**: F-20260226-014 (ext)
**前提**: PH-003-E 完了

テーマシステムとプロジェクト一覧ウィジェットへの Git ステータス統合を実装する。

## 技術要素

- テーマ: shadcn-svelte CSS 変数ベース（`--background`, `--foreground` 等を上書き）
- `themes` テーブルでカスタムカラーを永続化
- テーマ インポート/エクスポート（JSON ファイル）
- Git ステータス: `tauri-plugin-shell` で `git status --short` を実行 → パース → ウィジェットに表示

## DB マイグレーション

`src-tauri/migrations/005_themes.sql`:

```sql
CREATE TABLE IF NOT EXISTS themes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    is_active INTEGER NOT NULL DEFAULT 0,
    css_vars TEXT NOT NULL DEFAULT '{}',  -- JSON: {"--background": "#...", ...}
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
-- プリセット
INSERT INTO themes (id, name, is_active, css_vars) VALUES
    ('theme-light', 'Light', 0, '{}'),
    ('theme-dark', 'Dark', 1, '{}');
```

## 受け入れ条件

- [ ] テーマ（ダーク・ライト）を切り替えられる
- [ ] カスタムカラーでテーマを作成・保存できる
- [ ] テーマを JSON ファイルとしてエクスポート/インポートできる
- [ ] プロジェクト一覧ウィジェットで Git ブランチ名が表示される
- [ ] プロジェクト一覧ウィジェットで未コミット変更の有無がアイコンで表示される
- [ ] `pnpm verify` が全通過する
