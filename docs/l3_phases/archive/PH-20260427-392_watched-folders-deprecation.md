---
id: PH-20260427-392
status: done
batch: 87
type: 整理
era: Polish Era
---

# PH-392: watched_folders deprecated 完全削除

## 参照した規約

- batch-84 PH-378 で `registry.test.ts` の `DEPRECATED_WIDGETS` に登録（Polish Era 削除候補）
- フロント未実装の WidgetType variant がコードに残るのは bug の温床

## 横展開チェック実施済か

- Rust enum `WidgetType::WatchedFolders` の使用箇所:
  - `src-tauri/src/models/workspace.rs` enum + `as_str` + `from_str` + tests
  - `src-tauri/src/bin/arcagate_cli.rs` validate / describe / test
- フロント側:
  - `src/lib/bindings/WidgetType.ts` (ts-rs auto-generated)
  - `src/lib/types/workspace.ts` `WIDGET_LABELS.watched_folders`
- DB マイグレーション: 既存 `watched_folders` レコードの扱い → 統合 or 削除

## 仕様

### Rust 側

1. `WidgetType::WatchedFolders` バリアント削除
2. `as_str` / `from_str` の該当 arm 削除
3. CLI の validate / describe からも削除
4. tests から該当アサーション削除
5. `cargo test --lib export_bindings` で TS bindings 再生成

### フロント側

1. `WIDGET_LABELS.watched_folders` 削除
2. `registry.test.ts` の `DEPRECATED_WIDGETS` から削除（消えるので不要）

### DB マイグレーション

既存 DB に `watched_folders` widget レコードが存在する場合の扱い:

- **オプション A**: `projects` widget に統合（projects は同等の機能を持つ）
- **オプション B**: 警告表示で削除（破壊的だが個人プロジェクトなのでアリ）

batch-87 では **オプション A** を選択し、新規 migration `00XX_drop_watched_folders.sql` で:

```sql
UPDATE workspace_widgets SET widget_type = 'projects' WHERE widget_type = 'watched_folders';
```

実機 DB 確認: `watched_folders` レコードが存在しなければ migration は no-op。

## 受け入れ条件

- [x] Rust 側の `WatchedFolders` 全関連コード削除
- [x] ts-rs bindings 再生成（`watched_folders` が無いことを確認、自動 export）
- [x] WIDGET_LABELS から削除
- [x] DB マイグレーション 017 追加（既存レコードを projects に統合）
- [x] `registry.test.ts` の `DEPRECATED_WIDGETS` 空に
- [x] `pnpm verify` 全通過（cargo test 177 / 0 failed）
- [x] e2e リグレッション 0（CI で確認、batch-87 PR で）

## SFDIPOT 観点

- **S**tructure: dead code の除去
- **D**ata: DB レコードの安全な migration
- **H**istory（HICCUPPS）: 過去の使用履歴と互換性
