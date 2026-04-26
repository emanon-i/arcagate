# ウィジェット追加チェックリスト

新しいワークスペースウィジェットを追加するときに触る箇所を網羅したチェックリスト。
**漏れると Sidebar から追加できない / aria-label が enum 値になる / Rust と TS の同期が崩れる** 等の問題が発生。

## ステップ

### 1. Rust 側（型定義）

- [ ] `src-tauri/src/models/workspace.rs` の `WidgetType` enum に **PascalCase** で variant 追加
- [ ] `as_str` の match arm に snake_case 文字列を追加
- [ ] `from_str` の match arm に snake_case → enum を追加
- [ ] `tests::test_widget_type_as_str` / `test_widget_type_from_str_valid` / `test_widget_type_roundtrip` に assert 追加

### 2. TS 側（型は ts-rs で自動生成）

- [ ] `cargo test --lib export_bindings` を実行 → `src/lib/bindings/WidgetType.ts` が自動更新（手書き不要）
- [ ] `src/lib/types/workspace.ts` の `WIDGET_LABELS` Record に日本語ラベル追加（**`Record<WidgetType, string>` で漏れは compile-time fail**）

### 3. Widget 本体

- [ ] `src/lib/components/arcagate/workspace/<Name>Widget.svelte` を新規作成
  - `WidgetShell` を import、`title` / `icon` / `menuItems` を渡す
  - props: `widget?: WorkspaceWidget`
  - config 永続化: `workspaceStore.updateWidgetConfig(widget.id, JSON.stringify(next))`
  - `menuItems = [{ label: '設定', onclick: () => settingsOpen = true }]`
  - 末尾に `<WidgetSettingsDialog {widget} open={settingsOpen} onClose={...} />`

### 4. UI 統合（4 箇所同期、batch-72 で発覚した「忘れる箇所」）

- [ ] `src/lib/components/arcagate/workspace/WorkspaceLayout.svelte`:
  - import 追加
  - `widgetComponents` map に `widget_type: NewWidget` 登録
- [ ] `src/lib/components/arcagate/workspace/WorkspaceSidebar.svelte`:
  - icon import 追加
  - `widgetIcons` map に `widget_type: Icon` 登録
- [ ] `src/lib/components/arcagate/workspace/WidgetSettingsDialog.svelte`:
  - `WidgetConfig` interface に新フィールド追加
  - `$derived` で default 値定義
  - `handleSave` 関数の if/else if 連鎖に branch 追加
  - 設定 UI の `{:else if widget.widget_type === 'xxx'}` ブロック追加

### 5. Rust IPC（必要時のみ）

- [ ] `src-tauri/src/services/<name>_service.rs` 新規作成 + 単体テスト
- [ ] `src-tauri/src/commands/<name>_commands.rs` 新規作成
- [ ] `src-tauri/src/services/mod.rs` / `commands/mod.rs` に `pub mod` 追加
- [ ] `src-tauri/src/lib.rs` の `use commands::xxx::cmd_xxx` + `invoke_handler` 配列に登録

### 6. 検証（必須）

- [ ] `bash scripts/audit-widget-coverage.sh` → variant 集合一致確認
- [ ] `bash scripts/audit-labels.sh` → ラベル原則違反 0
- [ ] `pnpm verify` 全通過
- [ ] 実機 `pnpm tauri dev` で「編集モード → Sidebar palette に新ウィジェット表示 → drag drop で追加 → 設定モーダル → 表示確認」を完走

## 機械化された検証（自動 fail するもの）

| 検証                                        | 場所                     | 検出する漏れ                                          |
| ------------------------------------------- | ------------------------ | ----------------------------------------------------- |
| `audit-widget-coverage.sh`                  | lefthook pre-commit + CI | Rust enum ↔ ts-rs bindings ↔ WIDGET_LABELS の集合差分 |
| `audit-labels.sh`                           | lefthook pre-commit + CI | aria-label / 表示テキストにアイコン名直書き           |
| `WIDGET_LABELS: Record<WidgetType, string>` | svelte-check             | 全 variant の label 漏れ                              |
| `cargo test --lib export_bindings`          | pre-push lefthook + CI   | TS bindings 再生成漏れ（commit すべき変更が出る）     |

## batch-80 以降の改善予定

- folder-per-widget colocation（`src/lib/widgets/<name>/` 1 フォルダ集約）
- WidgetSettingsDialog 解体（dedicated `<Name>Settings.svelte`）
- これらが入ると **触るファイル数が 9 → 2 に削減**

## 参考

- `docs/lessons.md` 「ウィジェット追加 4 箇所同期必須」
- `docs/l1_requirements/ux_standards.md` §11 (Widget UX)
- `CLAUDE.md` 哲学節 「同じ機能 = 同じ icon + 同じラベル」
