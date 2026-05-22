# Widget Chrome 一貫性 Matrix (PH-PQ-600 A polish sweep)

> PH-PQ-600 A1/A2/A3 の成果物。全 widget の chrome / 設定 modal / 状態表示の一貫性を 1 表で
> 機械検証可能な形に固定する。場当たり fix (#535/#536/#537 連続 chrome PR) を繰り返さず、
> ここで全 widget を 1 度通しで仕上げ切った結果を記録する。

## 機械検証

このページの ✓ は以下の audit script で常時 gate 化されている (CI で実行):

- `scripts/audit-widget-shell.sh` — 全 `*Widget.svelte` が `WidgetShell` + `widgetMenuItems` + `WidgetSettingsDialog` を使用
- `scripts/audit-widget-coverage.sh` — Rust `WidgetType` enum ↔ TS bindings ↔ i18n `widget_label` の 3 点同期
- `scripts/audit-widget-settings-schema.sh` — `SettingsContent` registry と widget 本体の config schema 一致

## A1. Chrome 一貫性 matrix (16 widget 全件)

| widget            | WidgetShell | header (icon+title) | sort/filter 帯 | settings modal | context menu |
| ----------------- | ----------- | ------------------- | -------------- | -------------- | ------------ |
| favorites         | ✓           | ✓ WidgetShell       | —              | ✓              | ✓            |
| recent            | ✓           | ✓ WidgetShell       | —              | ✓              | ✓            |
| projects          | ✓           | ✓ WidgetShell       | ✓ sort/view    | ✓              | ✓            |
| item              | ✓           | ✓ WidgetShell       | ✓ view toggle  | ✓              | ✓            |
| stats             | ✓           | ✓ WidgetShell       | —              | ✓              | ✓            |
| quick_note        | ✓           | ✓ WidgetShell       | —              | ✓              | ✓            |
| exe_folder        | ✓           | ✓ WidgetShell       | ✓ sort/view    | ✓              | ✓            |
| daily_task        | ✓           | ✓ WidgetShell       | —              | ✓              | ✓            |
| snippet           | ✓           | ✓ WidgetShell       | —              | ✓              | ✓            |
| clipboard_history | ✓           | ✓ WidgetShell       | ✓ search bar   | ✓              | ✓            |
| file_search       | ✓           | ✓ WidgetShell       | ✓ search bar   | ✓              | ✓            |
| system_monitor    | ✓           | ✓ WidgetShell       | —              | ✓              | ✓            |
| image_scrap       | ✓           | ✓ WidgetShell       | —              | ✓              | ✓            |
| file_preview      | ✓           | ✓ WidgetShell       | —              | ✓              | ✓            |
| script_folder     | ✓           | ✓ WidgetShell       | ✓ sort 帯      | ✓              | ✓            |
| routine           | ✓           | ✓ WidgetShell       | —              | ✓              | ✓            |

- **header**: icon + title + 右上の icon button 列 (歯車 = 設定) は全 widget `WidgetShell` 任せ。
  個別 widget が独自 header を持たない (`audit-widget-shell.sh` で gate)。
- **sort/filter 帯**: 一覧を持ち並び替え / 絞り込みが意味を持つ 6 widget のみが sticky bar を持つ。
  単一 content widget (quick_note / image_scrap 等) には不要 — 「無いのが正」で diff ではない。
- **context menu**: widget body 右クリックの共通 context menu は `WidgetShell` の
  `handleWidgetContextMenu` が全 widget に attach。個別実装なし。

## A2. 設定 modal の共通化 (16 widget 全件)

全 widget の設定 modal は `WidgetSettingsDialog.svelte` (= `BaseDialog` の 3-pane layout:
header 固定 / body scroll / footer 固定) を共通シェルとして使う。各 widget は
`index.ts` で `SettingsContent` component を 1 つ登録するだけで、modal の罫線・枠・
保存/キャンセル/削除 footer・用語・live 反映は全 widget で共通。

| 共通要素                          | 担保箇所                                       |
| --------------------------------- | ---------------------------------------------- |
| modal シェル (header/body/footer) | `WidgetSettingsDialog.svelte` (全 widget 共通) |
| 設定を開く menu item (歯車)       | `_shared/menu-items.ts` `widgetMenuItems()`    |
| 保存 / キャンセル / 削除 footer   | `WidgetSettingsDialog.svelte`                  |
| config schema ↔ SettingsContent   | `audit-widget-settings-schema.sh` で gate      |

共通設定フィールド component (1 widget だけで終わらせず横展開済):

- `_shared/CommonMaxItemsSettings.svelte` — favorites / recent / stats
- `_shared/FolderPickerField.svelte` — projects / exe_folder / script_folder

## A3. empty / loading / error 状態の共通 component (16 widget 全件)

3 状態は `src/lib/components/common/` の共通 component で統一:
`EmptyState.svelte` / `LoadingState.svelte` / `ErrorState.svelte`。

| widget            | empty             | loading         | error             |
| ----------------- | ----------------- | --------------- | ----------------- |
| favorites         | EmptyState ※1     | —               | —                 |
| recent            | EmptyState ※1     | —               | —                 |
| projects          | EmptyState        | LoadingState    | ErrorState        |
| item              | EmptyState        | —               | —                 |
| stats             | EmptyState        | —               | —                 |
| quick_note        | — (常時 textarea) | —               | —                 |
| exe_folder        | EmptyState        | LoadingState    | ErrorState        |
| daily_task        | EmptyState        | —               | —                 |
| snippet           | EmptyState        | —               | —                 |
| clipboard_history | EmptyState        | —               | —                 |
| file_search       | EmptyState        | LoadingState ※2 | ErrorState        |
| system_monitor    | — (常時 metrics)  | LoadingState    | degraded badge ※3 |
| image_scrap       | EmptyState        | —               | ErrorState        |
| file_preview      | EmptyState        | LoadingState    | ErrorState        |
| script_folder     | EmptyState        | LoadingState    | ErrorState        |
| routine           | EmptyState        | —               | —                 |

- ※1 favorites / recent は `WidgetItemList` 経由。`WidgetItemList` が共通 `EmptyState` を
  描画し、widget 固有 icon を `emptyIcon` prop で受ける (PH-PQ-600 A3 で旧 inline div を撤去)。
- ※2 file_search の長い fs walk の「中止」は `LoadingState` の `action` slot で担保
  (PH-PQ-600 A3 で `LoadingState` に optional action を追加、独自 loading UI を撤去)。
- ※3 system_monitor の「—」は同期取得で空状態が発生しない意。連続失敗時の degraded badge は
  stale data を表示し続けながら劣化を可視化する quality indicator であり、full error
  takeover (= `ErrorState`) とは別物。完全未取得時は `LoadingState` を使う。
- 「—」は その状態が構造的に発生しない widget (同期実装 / 常時 content)。
  発生し得る状態は全て共通 component を使い、旧 inline 表示は残っていない。

## A4. 性能予算

予算: mount → first paint ≤ 100ms / 設定変更 → 反映 ≤ 50ms (`instant-feedback` rule)。
計測 spec は `tests/perf/widget-perf.spec.ts` (`pnpm test:perf widget-perf`)。

実測 (2026-05-22、debug binary):

- **mount → first paint**: 全 16 widget で 1〜28ms (空 canvas tab 切替 baseline 68ms を
  差し引いた marginal cost)。違反 0。最大は favorites の 28ms。
- **設定変更 → 反映**: routine widget 実測 8.8ms (設定 dialog の保存 click → widget DOM
  反映までを in-page MutationObserver で計測)。違反 0。

設定変更の反映は全 widget で `workspace_widgets.config` JSON の `$derived` 再 parse のみ
(IPC 往復や再 scan を反映経路に持たない) ため、計測した routine と同じく全 widget が
instant-feedback 予算内。
