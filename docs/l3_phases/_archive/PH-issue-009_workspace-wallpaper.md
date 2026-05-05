---
id: PH-issue-009
title: Workspace per-workspace 背景壁紙 + Library 共通 default
status: done-phase-a
parent_l1: REQ-006_workspace-widgets
related: 旧 PH-499 (壁紙、rollback で revert)、本 plan で再構築
---

# Issue 9: Workspace 背景壁紙

## 元 user fb (検収項目 #9)

> ウィジットの背景壁紙設定したい。ライブラリ画面と共通でもいい + Workspace ごとに背景変えれたら更にいい

## 引用元 guideline doc

| Doc                                                  | Section                            | 採用判断への寄与                         |
| ---------------------------------------------------- | ---------------------------------- | ---------------------------------------- |
| `docs/l1_requirements/design_system_architecture.md` | **§4-3 壁紙設定の要件 (将来実装)** | 既に設計あり、本 plan で実装             |
| `docs/l1_requirements/ux_design_vision.md`           | §4 Ubuntu Frosted Glass            | 壁紙が透けて見える参照                   |
| `docs/l0_ideas/arcagate-visual-language.md`          | Frosted Glass、過度に派手 NG       | opacity / blur 制御                      |
| `docs/desktop_ui_ux_agent_rules.md`                  | P11 (装飾より対象) / P9 (画面密度) | 壁紙が widget content より目立たないこと |

## Fact 確認 phase

旧 PH-499 (rollback で revert) で実装した内容:

- migration 018: workspaces table に wallpaper_path / wallpaper_opacity / wallpaper_blur 追加 + library_wallpaper_* config defaults
- wallpaper_service: 画像を `%LOCALAPPDATA%/Arcagate/wallpapers/<uuid>.<ext>` にコピー
- WorkspaceLayout に absolute layer で壁紙 background-image 表示

⚠️ **DB column は orphan** (rollback 後も残ってる、`docs/dispatch-log.md` 「2026-04-28 hard rollback」参照)

## UX 本質 phase

User 「背景壁紙」 =

1. **per-workspace** で各 Workspace ごとに違う壁紙 (作業の文脈切替 → 雰囲気切替)
2. **Library 共通 default** = workspace 未設定時のフォールバック
3. **opacity / blur slider** で「壁紙の主張」を user 調整可能 (装飾 vs 対象、P11)
4. PH-issue-008 の Mica と組み合わせ: Mica + 半透明 + 壁紙の 3 層構造

## 横展開 phase

| 領域                                                                         | 対応                                                                   |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| migration                                                                    | **新規追加なし** (旧 018 が orphan column として残存)、再利用          |
| `workspaces` model + repository                                              | rollback で revert された wallpaper_path / opacity / blur 関連を再追加 |
| `wallpaper_service.rs`                                                       | 新規再追加 (画像保存、UUID コピー)                                     |
| IPC: `cmd_set_workspace_wallpaper` / `cmd_clear` / `cmd_save_wallpaper_file` | 再追加                                                                 |
| Settings > 外観                                                              | Library 共通 default の wallpaper 設定 UI                              |
| WorkspaceSettingsDialog                                                      | per-workspace 上書き UI                                                |
| WorkspaceLayout                                                              | 背景 layer (absolute inset-0、`bg-[url(...)]` + opacity + blur)        |
| Library                                                                      | Library 画面に同 layer (Library 共通 wallpaper)                        |

## Plan: 採用案 A: 「per-workspace 壁紙 + Library 共通 default」

**仕様**:

- 各 Workspace に `wallpaper_path?: string`, `wallpaper_opacity: number (0..1)`, `wallpaper_blur: number (0..40)` 保存
- 設定なし Workspace は `library_wallpaper_*` config を継承
- 画像形式: png/jpg/jpeg/webp (validation)
- 保存先: `%APPDATA%/com.arcagate.desktop/wallpapers/<uuid>.<ext>`
- Tauri asset protocol (`convertFileSrc`) で画像読込

**UI**:

- Settings > 外観 > 「Library 背景画像」section: ファイル選択 + opacity slider + blur slider + クリアボタン
- WorkspaceSettingsDialog (各 workspace の設定 dialog) に「壁紙」section: 同上 + 「Library default を使う」option
- WorkspaceLayout / LibraryMainArea に `<div class="absolute inset-0 pointer-events-none" style="background-image: url(...); opacity: ...; filter: blur(...)">`

**Reduced Motion**: 壁紙 blur アニメは `motion-reduce:filter-none` で無効化。

## 棄却案 B: 「全画面共通 1 枚壁紙のみ、per-workspace なし」

- user fb 「Workspace ごと変えれたらいい」明示要望に反する
- → 棄却

## 棄却案 C: 「壁紙画像を DB に BLOB で保存」

- DB サイズ膨張、export/import 重い
- file path 保存 + asset protocol が標準
- → 棄却

## E2E 1 シナリオ

- `tests/e2e/workspace-wallpaper.spec.ts`:
  - workspace A 作成 → 壁紙設定 → 画像が表示 → workspace B 切替 → A の壁紙が消えて B (default) → B にも壁紙設定 → 切替 → 各 workspace 固有壁紙

## 規格 update

`ux_standards` に「§15 Wallpaper 規格」新設:

- 画像形式: png/jpg/jpeg/webp
- opacity 0..1、blur 0..40px
- Reduced Motion 時 blur 0
- Frosted Glass / Mica と重ね順整合

## 実装ステップ

1. migration: orphan column の再活用 (新 migration 不要、rollback で残存)
2. workspace model + repository に wallpaper field 追加
3. `wallpaper_service.rs` 新規再追加
4. IPC 4 件 (set/clear workspace、set/clear library、save_file、get_library)
5. Settings > 外観 「Library 背景画像」UI
6. WorkspaceSettingsDialog 「壁紙」UI
7. WorkspaceLayout / LibraryMainArea 背景 layer
8. E2E spec
9. ux_standards §15 新設

## 依存

- 単独 plan、他 issue とは独立して進められる
- PH-issue-008 (Mica) と組み合わせると更に Frosted 風になる (相乗、ただし依存関係なし)
