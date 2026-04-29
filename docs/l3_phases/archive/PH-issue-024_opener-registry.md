---
id: PH-issue-024
title: Opener registry — Widget default + per-item override + 右クリック「Open with…」
status: planning
parent_l1: REQ-006_workspace-widgets
related: 既存 launch_service::launch_folder_with_app の vscode/terminal hardcode を一般化、PH-issue-023 Phase B で導入した widget_item_settings table を活用
---

# Issue 28: Opener registry

## 元 user fb (検収項目 #28)

> アイテム別 opener registry を作る。Widget 全体の default opener (Explorer)、各 item に override (VSCode / Terminal / PowerShell / Cmd / カスタム)。
> 右クリック「Open with…」context menu。
> opener registry: app name + 実行コマンド + icon を Settings の「Openers」section で登録。
> 既知 opener default 同梱: Explorer / VSCode (`code <path>`) / Windows Terminal (`wt -d <path>`) / PowerShell / Cmd。
> per-item override は item config に `opener: string | null` (null = widget default)。
> widget_item_settings table (PR #240) の opener column を活用。

## 引用元 guideline doc

| Doc                                                | Section                                                     | 採用判断への寄与                                                                           |
| -------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `docs/desktop_ui_ux_agent_rules.md`                | P1 操作可視化 / P3 主要 vs 補助 / P5 OS 文脈                | 主要 = click default、補助 = 右クリック「Open with…」。OS 慣習 (Explorer Open with) と整合 |
| `docs/l1_requirements/ux_standards.md`             | §6-1 Widget / §11 Context menu                              | Widget item rows に右クリック menu、共通 context-menu component                            |
| `docs/l1_requirements/vision.md`                   | M1 launch 摩擦ゼロ                                          | 「click 1 回で意図したアプリで開く」が core value                                          |
| `docs/l0_ideas/arcagate-engineering-principles.md` | §3 エラーハンドリング標準                                   | opener が見つからない / 起動失敗時は toast                                                 |
| `CLAUDE.md`                                        | 設計原則 (Service Layer 共通経路 / Repository 直接呼ばない) | opener_service が共通経路、launch_service から呼ぶ                                         |

## Fact 確認 phase

### 既存実装

`src-tauri/src/services/launch_service.rs:85-92`:

```rust
fn launch_folder_with_app(path: &str, default_app: Option<&str>) -> Result<(), AppError> {
    match default_app {
        Some("vscode") => launcher::launch_exe_args("code", &[path], None),
        Some("terminal") => launcher::launch_exe_args("wt", &["-d", path], None),
        Some(custom) => launcher::launch_exe_args(custom, &[path], None),
        None => launcher::launch_folder(path),
    }
}
```

→ 「opener」という抽象が **暗黙的に hardcode されている**。"vscode" / "terminal" は string match で固定、他の opener は custom path のみ。
→ Folder のみ、Exe / Url / Script では未対応。
→ widget config 経由でのみ設定可能 (UI は WatchedFoldersSettings の "default app" select)。

### widget_item_settings

`PR #240` で `widget_item_settings` table 追加済 (key=item.target、JSON snapshot)。
JSON の中身は `{ "default_app": "...", "is_enabled": bool, "label": "..." }` のみ。
**`opener` field は未使用** → 本 plan で活用。

## UX 本質 phase

User の core value:

1. **「毎日使えるか?」**: 同じ folder を Explorer で開く / VSCode で開く / Terminal で開くが日に何度も発生 → **click ごとに「どのアプリで?」選ぶのは摩擦**
2. **解: per-item の persistent default + 右クリック「Open with…」で例外運用**:
   - default: widget 全体 = Explorer (=直感的・OS 標準)
   - per-item override: 「この folder は VSCode default」を 1 回設定 → 以降 click は VSCode
   - 例外: 右クリック → Terminal (一時的な切替)
3. **Settings > Openers**: app name + command + icon を user が登録 (e.g. `vim`, `Cursor`, `Sublime`)

## 横展開 phase

| 領域                                     | 影響                                                                                                                                                   |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `launch_service::launch_folder_with_app` | opener_service 経由に書き換え、hardcode 撤廃                                                                                                           |
| Folder 以外の Exe / Url / Script         | opener の概念は **基本 Folder にのみ意味**。Exe は自分自身で起動、Url はブラウザが暗黙の opener。本 plan では **Folder + Exe (フォルダ含む)** のみ対象 |
| `launch_service::launch_item`            | item.opener_id を読み取り opener_service にデリゲート                                                                                                  |
| `widget_item_settings` JSON              | 既存 `default_app` field と並んで `opener_id` field 追加 (両者同義、移行)                                                                              |
| Widget config 全種類                     | `opener_id?: string` を共通フィールドとして導入 (default = "builtin:explorer")、各 Widget Settings dialog で選択可能に                                 |
| ContextMenu component                    | 既存 `WidgetShell` の menu 系 + WatchFolderWidget の "Open with…" 候補 popover を統合                                                                  |

## 採用案 A: 「openers table + builtin compiled-in + ContextMenu 統一」

### Backend

1. **migration 020**: `openers` table (id TEXT PK, name TEXT, command_template TEXT, icon_path TEXT NULL, sort_order INT, created_at TEXT)
2. **builtin openers** (compiled-in、`opener_service::BUILTIN_OPENERS`):
   - `builtin:explorer` → `cmd /c start "" "<path>"` (default fallback、null と等価)
   - `builtin:vscode` → `code "<path>"`
   - `builtin:wt` → `wt -d "<path>"`
   - `builtin:powershell` → `powershell -NoExit -Command "Set-Location '<path>'"`
   - `builtin:cmd` → `cmd /K cd /d "<path>"`
3. **Opener model**: `{ id, name, command_template, icon_path, is_builtin }`
4. **opener_repository**: list / find_by_id / save / delete (custom only)
5. **opener_service**:
   - `list_all() -> Vec<Opener>` (builtin + custom merged)
   - `resolve(opener_id) -> Opener` (builtin lookup → DB lookup → fallback to explorer)
   - `launch_with(opener, target_path, working_dir) -> Result<()>` (template の `<path>` を substitute、shell-words で split、`Command::spawn`)
6. **IPC**: cmd_list_openers / cmd_save_opener / cmd_delete_opener / cmd_launch_with_opener (item_id, opener_id_override)

### Frontend

1. **Settings > Openers section**: `OpenerSettings.svelte`
   - builtin list (read-only、5 件)
   - custom list (CRUD: name + command + delete)
   - 「+ 追加」ボタン → modal で name / command_template 入力
2. **ContextMenu component** (新規): `src/lib/components/common/ContextMenu.svelte`
   - 右クリック位置に portal、Esc / click-outside で close
   - menu items: launch label / "Open with…" submenu / divider / 削除 / 設定
3. **Widget item rows** (横展開):
   - `WidgetItemList`、`ExeFolderWatchWidget`、`WatchFolderWidget`、`FileSearchWidget` に oncontextmenu handler
   - context menu に「Open with…」submenu (全 opener list)
   - 選択 → `cmd_launch_with_opener(item_id, opener_id)` 即起動
4. **Per-item default 永続化**:
   - context menu の opener 選択時に option「default にする」を Footer button で提供
   - 選択時 `widget_item_settings` の JSON に `opener_id` を保存
5. **Widget Settings dialog**: 各 widget の Settings dialog に「default opener」select 追加

### E2E (`tests/e2e/opener-registry.spec.ts`)

1. WatchFolder で folder A を click → Explorer 起動 (default)
2. 右クリック → 「Open with VSCode」 → VSCode 起動
3. 右クリック → 「Open with VSCode (default にする)」 → 以降 click で VSCode 起動
4. Settings > Openers で custom opener "Cursor" 登録 → 右クリック menu に "Cursor" 出現
5. 既存の widget config `default_app` ("vscode" / "terminal") から `opener_id` ("builtin:vscode" / "builtin:wt") への migration 不要 (両系統並走、新規は opener_id のみ)

## 棄却案 B: 「opener を builtin のみ、custom 不可」

- user 「opener registry…登録」明示要望に反する
- → 棄却

## 棄却案 C: 「SHOpenWithDialog (Windows native) を全面採用」

- Windows API 依存、Tauri から呼ぶ追加 crate / FFI 必要、Linux/macOS 互換性なし (将来制約)
- 本 plan では builtin + custom registry で代替、SHOpenWithDialog は将来 phase
- → 棄却 (本 plan では実装しない、future phase)

## 実装ステップ

1. migration 020 + opener model + opener_repository + opener_service (builtin + DB)
2. cmd_list_openers / cmd_save_opener / cmd_delete_opener / cmd_launch_with_opener IPC
3. 既存 launch_folder_with_app を opener_service 経由に置換 (vscode/terminal hardcode 撤廃)
4. Settings > Openers UI
5. ContextMenu component 新規
6. Widget item rows に oncontextmenu handler 統合
7. Per-item override 永続化 (widget_item_settings JSON 拡張)
8. Widget Settings dialog に default opener select
9. E2E spec
10. ux_standards §11 Context menu update / §16 Opener registry 新設

## 横展開 audit (機械化)

```sh
# Folder 起動が opener_service 経由か、hardcode 残ってないか
grep -rn "launch_folder_with_app\|launch_exe_args.*code\|launch_exe_args.*wt" src-tauri/src/
# 期待: opener_service.rs 内のみ
```
