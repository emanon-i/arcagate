---
status: wip
phase_id: PH-20260423-193
title: ホットキー変更時のランタイム再登録
category: バグ修正
scope_files:
  - src-tauri/src/commands/config_commands.rs
parallel_safe: false
depends_on: []
---

## 目的

Settings でホットキーを変更しても、アプリ再起動まで新しいホットキーが効かない。
`cmd_set_hotkey` が DB 書き込みのみで `global_shortcut` の再登録を行っていないため。

## 変更方針

`cmd_set_hotkey` に `tauri::AppHandle` パラメータを追加し、
旧ホットキーをアンレジスターしてから新ホットキーを登録する。

```rust
use tauri_plugin_global_shortcut::GlobalShortcutExt;

#[tauri::command]
pub fn cmd_set_hotkey(
    app: tauri::AppHandle,
    db: State<DbState>,
    hotkey: String,
) -> Result<(), AppError> {
    // 旧ホットキーをアンレジスター（失敗しても続行）
    if let Ok(old) = config_service::get_hotkey(&db) {
        let _ = app.global_shortcut().unregister(&old);
    }
    // DB に保存
    config_service::set_hotkey(&db, &hotkey)?;
    // 新ホットキーを登録
    app.global_shortcut()
        .register(&hotkey)
        .map_err(|e| AppError::InvalidInput(e.to_string()))?;
    Ok(())
}
```

`tauri::AppHandle` は Tauri コマンドの特別パラメータで、
フロントエンドの IPC 呼び出しに追加不要（Tauri が自動挿入）。

## 検証

- `cargo test` 通過（`cmd_set_hotkey` に型引数追加でテストは影響なし）
- 実機: Settings でホットキーを変更 → 再起動せず新ホットキーでパレットが開く
