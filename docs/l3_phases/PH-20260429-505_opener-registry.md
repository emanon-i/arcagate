---
id: PH-20260429-505
title: Opener registry — Settings Openers section + per-item override + 右クリック menu + SHOpenWithDialog 連携
status: todo
batch: 109
era: per-widget-polish
parent_l1: REQ-006_workspace-widgets
scope_files:
  - src-tauri/migrations/ (new migration: openers table)
  - src-tauri/src/models/opener.rs (new)
  - src-tauri/src/repositories/opener_repository.rs (new)
  - src-tauri/src/services/opener_service.rs (new)
  - src-tauri/src/commands/opener_commands.rs (new)
  - src-tauri/src/launcher/opener.rs (new、SHOpenWithDialog FFI)
  - src/lib/types/opener.ts (new)
  - src/lib/state/opener.svelte.ts (new)
  - src/lib/components/settings/OpenersSettings.svelte (new section)
  - src/lib/widgets/exe-folder/ExeFolderWatchWidget.svelte (右クリック menu)
  - src/lib/widgets/file-search/FileSearchWidget.svelte (右クリック menu)
  - src/lib/widgets/item/ItemWidget.svelte (右クリック menu)
---

# PH-505: Opener registry

## 背景

ユーザー dev fb (2026-04-28、検収項目 #35、memory 27/28):

> アイテム別 opener (Open with system) registry、Settings に「Openers」section、Explorer / VSCode / Terminal / PowerShell / Cmd デフォルト同梱、SHOpenWithDialog 連携、per-item override、右クリック menu

## 設計

### Opener model

```rust
pub struct Opener {
    pub id: String,           // UUID v7
    pub label: String,        // "Explorer", "VS Code", "PowerShell"
    pub command: String,      // "explorer.exe" / "code.cmd" / "pwsh.exe"
    pub args_template: String, // "{path}" / "-NoExit -Command \"cd {path}\""
    pub icon: Option<String>, // lucide name or path
    pub builtin: bool,        // true = default 同梱、user 削除不可
    pub created_at: i64,
    pub updated_at: i64,
}
```

### Per-item opener override

`widget_item_settings.opener` (PH-504 で確保) に opener_id を格納。null = system default (双 click) or `SHOpenWithDialog` で都度選択。

### 右クリック menu

各 widget item で右クリック → context menu:

- 「開く」(default opener)
- 「Open with」→ submenu (registered openers + 「Choose another app...」(`SHOpenWithDialog`))
- 「この opener を default に保存」(per-item)
- 「設定...」(opener registry を開く)

### SHOpenWithDialog 連携 (Windows ネイティブ)

```rust
// shell32 SHOpenWithDialog 呼び出し
extern "system" {
    fn SHOpenWithDialog(hwnd: HWND, poainfo: *const OPENASINFO) -> HRESULT;
}
```

選んだ app は per-item override として保存可能 (オプションダイアログ)。

## 受け入れ条件

### DB / Rust

- [ ] migration `0028_openers.sql` (openers table 新規)
- [ ] **Builtin openers 同梱**: Explorer / VS Code / Terminal / PowerShell 7 / cmd.exe / Notepad
  - VS Code は `code.cmd` PATH 通れば登録、無ければ skip
  - Terminal は `wt.exe` (Windows Terminal) PATH 通れば登録
- [ ] Rust service: `list_openers()` / `get_opener(id)` / `create_opener(...)` / `update_opener(...)` / `delete_opener(id)` (builtin 削除拒否) / `launch_with_opener(opener_id, path)` / `show_open_with_dialog(path) -> Option<opener_id>`
- [ ] **SHOpenWithDialog FFI** (`launcher/opener.rs`、Windows 専用 `cfg(windows)`)
- [ ] **launch_with_opener** = command + args_template の `{path}` 置換 → `Command::new(command).args(...).spawn()` (PH-422 shell-words 整合)

### Frontend

- [ ] **Settings > Openers section** 新規 (一覧 + 新規追加 + builtin/custom 区別 + delete confirm + reorder)
- [ ] **各 widget item で右クリック menu** (上記設計通り)
- [ ] **per-item default opener 保存** UI (確認 dialog)
- [ ] **opener.svelte.ts store** (CRUD + reactive)
- [ ] **launch flow**: クリック = per-item opener (あれば) → builtin default (Explorer 等) → `launchItem` (既存)

### a11y

- [ ] keyboard ナビ: 右クリック menu は Shift+F10 / Apps key で開く
- [ ] menu 内 ArrowUp/Down + Enter

### テスト

- [ ] Rust integration: openers CRUD + builtin 削除拒否
- [ ] Rust integration: launch_with_opener で args 正しく組み立て
- [ ] E2E: Settings で opener 追加 → widget item 右クリック → opener 選択 → 起動 assert
- [ ] E2E: SHOpenWithDialog は **手動確認のみ** (CI で開けない、dispatch-log に記録)
- [ ] before/after スクショ取得

## 実装ステップ

1. migration + Rust model + repository (TDD)
2. service + commands
3. launcher/opener.rs (Windows SHOpenWithDialog FFI)
4. TS types / store
5. Settings > Openers section UI
6. widget item 右クリック menu (共通コンポーネント `OpenWithMenu.svelte`)
7. launch flow 統合
8. E2E spec
9. SHOpenWithDialog 手動確認 + dispatch-log
10. before/after スクショ

## 規約参照

- engineering-principles §2 (FFI = Rust 側、UI = TS 側)
- engineering-principles §6 SFDIPOT (Data: builtin vs custom, Operations: 右クリック menu)
- desktop_ui_ux_agent_rules.md (右クリック menu、Apps key)
- memory 27/28 (opener registry 採用記録)
