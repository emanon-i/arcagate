# Widget Chrome 一貫性 Matrix (PH-PQ-600 A polish sweep)

> PH-PQ-600 A1/A2/A3 の成果物。全 widget の chrome / 設定 modal / 状態表示の一貫性を 1 表で
> 機械検証可能な形に固定する。場当たり fix (#535/#536/#537 連続 chrome PR) を繰り返さず、
> ここで全 widget を 1 度通しで仕上げ切った結果を記録する。

## 機械検証

このページの ✓ は以下の audit script で常時 gate 化されている (CI で実行):

- `scripts/audit-widget-shell.sh` — 全 `*Widget.svelte` が `WidgetShell` + `widgetMenuItems` + `WidgetSettingsDialog` を使用
- `scripts/audit-widget-coverage.sh` — Rust `WidgetType` enum ↔ TS bindings ↔ i18n `widget_label` の 3 点同期
- `scripts/audit-widget-settings-schema.sh` — `SettingsContent` registry と widget 本体の config schema 一致
- `scripts/audit-sticky-bar-occlusion.sh` — `.ag-sticky-bar` token が `transparent` に戻されていない (= card scroll 内容が透けない)
- `scripts/audit-widget-default-config.sh` — widget body と settings dialog で同 config key に対する `?? <リテラル>` 不一致を fail-closed 検出

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
  描画し、widget 固有 icon を `emptyIcon` prop で受ける。
- ※2 file_search の長い fs walk の「中止」は `LoadingState` の optional `action` slot で担保。
- ※3 system_monitor の「—」は同期取得で空状態が発生しない意。連続失敗時の degraded badge は
  stale data を表示し続けながら劣化を可視化する quality indicator であり、full error
  takeover (= `ErrorState`) とは別物。完全未取得時は `LoadingState` を使う。
- 「—」は その状態が構造的に発生しない widget (同期実装 / 常時 content)。
  発生し得る状態は全て共通 component を使う (widget 独自の inline 表示は持たない)。

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

## A5. 監視ウィジェット族契約 (PH-CF-500)

監視ウィジェット 3 種 (`exe_folder` / `script_folder` / `projects`) は **同一 chrome 契約** に
従う。 polish sweep (PH-PQ-600) で「DOM クラス名一致」 で揃ったと誤判定した取りこぼし (D1 /
D3) を二度と起こさないため、 prop レベルで明文化する。

| 観点                  | 契約                                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------------------- |
| `WidgetShell.path`    | `config.<watched_folder \| watch_path>` を **必ず** 渡す (右クリック menu に Explorer / コピー を出す)  |
| `WidgetShell.icon`    | `index.ts` meta の `icon` と **必ず** 一致 (meta=`FolderOpen` なら shell も `FolderOpen`)               |
| description 配置      | empty / loading / error / list すべての state より **前** (= 外側) で render                            |
| config パース         | `parseWidgetConfig` helper (`$lib/utils/widget-config`) を使用 — 各 widget で `JSON.parse` 直書きしない |
| sort / filter toolbar | `WidgetShell.toolbar` snippet slot で渡す (= scroll container の外に静的配置)。 §A6 参照                |

`script_folder` は Library に永続化しないため item-hide / opener cascade の対象外 (機能差は
許容)、 上記 chrome 5 観点は 3 widget すべてで揃える。

## A6. toolbar 契約

並び替え / フィルタ / 検索など scroll 不要の toolbar を持つ widget は `WidgetShell.toolbar`
snippet slot を経由して **scroll container の外** に静的配置する。

- `ag-sticky-bar` class + `--ag-sticky-bar-bg` token は **使わない** (§機械検出で禁止)。 scroll
  container 外の静的配置なので「色付き帯」 (token vs widget body の色差) も「めり込み」 (scroll item が
  toolbar 下に透ける) も構造上発生しない。
- toolbar 自身に背景塗りは持たない (widget 本体 `.ag-glass` の継続として見える)。 active 表示は
  `font-semibold text-[var(--ag-accent-text)]` のみで表現し、 `bg-[var(--ag-surface-*)]` を子要素に
  使ってはならない。
- toolbar slot に渡す snippet は scan/load 完了かつ表示要素が存在するときだけ条件付きで渡す
  (`hasEntries ? toolbarSnippet : undefined`)。 0 件 / loading / error 状態では slot に何も渡さず
  WidgetShell 側で余白も出ない。
- 該当 widget: `exe_folder` / `projects` / `script_folder` / `file_search` (検索バー)。

機械検出: `scripts/audit-sticky-bar-occlusion.sh` で

- `--ag-sticky-bar-bg` token 再導入 (CSS の左辺定義) を fail
- `.ag-sticky-bar` CSS selector を fail
- svelte template の `class="...ag-sticky-bar..."` を fail
  の 3 軸 fail-closed gate。 半透明 / glass / 本体同色等の帯 token の導入を 一律禁止。

## A7. 設定デフォルト単一情報源契約 (PH-CF-500 D7)

widget の config default は **`index.ts` の `defaultConfig` (または `*_DEFAULTS` const) を
ただ 1 箇所** で定義する。 widget 本体・settings 双方が同 const を import して参照し、
`?? <リテラル>` のフォールバックを各所に書かない。

- 推奨実装: widget 本体は `parseWidgetConfig(widget?.config, DEFAULTS)` で defaults を merge、
  settings は `?? DEFAULTS.<field>` で同 const を参照 (リテラル禁止)。
- 違反例 (= 修正前 system-monitor): widget 本体が `cpu_chart_type ?? 'bar'`、 settings が
  `?? 'sparkline'` → クリーン config では widget は 'bar' を表示、 settings dialog を開く
  と 'sparkline' と表示。 「設定を開く前後で見た目が変わる」 (`instant-feedback` rule 違反)。

機械検出: `scripts/audit-widget-default-config.sh` で widget body と settings dialog の
`?? <リテラル>` 不一致を fail-closed gate。

## A8. 監視ウィジェットの復元 UI 契約 (PH-CF-500)

Library アイテムを自動登録する監視ウィジェット (`projects` / `exe_folder`) は、 設定 dialog
内に **「除外したアイテム」 section** を持つ。

- section は PH-CF-100 で記録された `widget_item_hides` の当該 widget 分を一覧 (列 =
  `item_target` = scan entry key)、 各行に「復元」 click action を持つ。
- 「復元」 → `widget_item_hides_repository::remove(widget_id, entry_key)` →
  `widgetItemHidesStore` refresh で UI 即時反映 (`instant-feedback` rule)。 次の scan で
  当該 entry が widget に再登録される。
- 空状態 (除外 0 件) は「除外したアイテムはありません」 + 説明文を表示。
- `script_folder` は Library 永続化しないため対象外 (= section を持たない)。

実装: `src/lib/widgets/_shared/WidgetExcludedItemsSection.svelte` を共通 component として、
`WidgetSettingsDialog` が `setContext` した `widget_id` を `getContext` で取り出す
(個別 widget の SettingsContent への prop drilling 不要)。

機械検出: e2e (`tests/e2e/widget-excluded-items-restore.spec.ts`) で
「Library 削除 → section 出現 → 復元 click → 次 scan で復活」 を verify。
