---
id: PH-20260429-505
title: Opener registry — Settings Openers section + per-item override + 右クリック menu + SHOpenWithDialog 連携
status: done
batch: 109
era: per-widget-polish
parent_l1: REQ-006_workspace-widgets
scope_files:
  - src-tauri/migrations/020_openers.sql (new、builtin seed 7 件)
  - src-tauri/src/db/migrations.rs
  - src-tauri/src/models/opener.rs (new)
  - src-tauri/src/models/mod.rs
  - src-tauri/src/repositories/opener_repository.rs (new、6 unit test)
  - src-tauri/src/repositories/mod.rs
  - src-tauri/src/services/opener_service.rs (new、5 unit test、launch_with_opener 含む)
  - src-tauri/src/services/mod.rs
  - src-tauri/src/commands/opener_commands.rs (new、6 IPC commands)
  - src-tauri/src/commands/mod.rs
  - src-tauri/src/lib.rs (handler 登録)
  - src/lib/types/opener.ts (new)
  - src/lib/ipc/opener.ts (new、6 IPC wrappers)
  - src/lib/components/settings/OpenersSettings.svelte (new、Settings > General に統合)
  - src/lib/components/settings/SettingsPanel.svelte (general タブで mount)
  - tests/e2e/openers-registry.spec.ts (new)
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

- [x] migration 020 (openers table 新規、ID 順は migration 採番 020)
- [x] **Builtin openers 同梱 (7 件)**: Explorer / cmd.exe / PowerShell / Notepad / VS Code / Windows Terminal / PowerShell 7
- [x] Rust service: list / get / create / update / delete (builtin 拒否) / launch_with_opener
- [ ] **SHOpenWithDialog FFI** (deferred — Windows-only FFI、CI 自動テスト不可、PH-505 後の follow-up plan で実装)
- [x] **launch_with_opener** = `args_template` の `{path}` 置換 → `shell_words::split` (PH-422 整合) → `Command::new(...).args(...).spawn()`、不在 command で LaunchFileNotFound
- [x] Rust unit: 11 tests (repository 6 + service 5)、cargo test 合計 244 passed

### Frontend

- [x] **Settings > Openers section** 新規 (`OpenersSettings.svelte`、一覧 + 新規追加 + builtin/custom 区別 + 削除 confirm + 編集)
- [ ] **各 widget item で右クリック menu** (deferred — opener registry 単独でも価値あり、右クリック統合は次 plan)
- [ ] **per-item default opener 保存** UI (deferred — widget_item_settings.opener field は PH-504 で確保済、UI 接続は次 plan)
- [x] **opener IPC wrappers** (`src/lib/ipc/opener.ts`、6 helpers)
- [ ] **launch flow 統合** (deferred — `cmd_launch_with_opener` は IPC で利用可、widget side の click → opener 選択は次 plan)

### a11y

- [ ] keyboard ナビ (右クリック menu の Shift+F10 / Apps key) — 右クリック menu deferred なのと同期

### テスト

- [x] Rust integration: openers CRUD + builtin 削除拒否
- [x] Rust integration: launch_with_opener で args 正しく組み立て (render_args + LaunchFileNotFound)
- [x] E2E: `tests/e2e/openers-registry.spec.ts` で IPC round-trip (builtin seed assert + custom CRUD + builtin delete 拒否 + launch_with_opener エラー)
- [ ] E2E: SHOpenWithDialog (手動確認のみ、SHOpenWithDialog deferred のため未実施)
- [ ] before/after スクショ取得 (CDP 自己検証は次回 main 反映後)

## 後続 plan に持ち越し

- SHOpenWithDialog FFI (Windows-only、CI 自動テスト不可)
- 各 widget item の右クリック menu (opener 選択 UI)
- per-item default opener 保存 UI (widget_item_settings.opener への書き込み)
- launch flow 統合 (widget click → per-item opener → fallback)

これらは opener registry の UI 拡張系で、本 plan の core (DB / IPC / Settings UI) が固まれば後追い可能。

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
