---
id: PH-issue-026
title: Settings dialog 全 audit + polish — 共通 Switch / clamp 統一 / shadcn Button 統一 / dialog title 改善
status: planning
parent_l1: REQ-006_workspace-widgets
related: PR #248 (AutostartToggle proper switch / HotkeyInput recording state)、PH-issue-024 (Opener registry Settings)
---

# Issue 23: Settings dialog 全 audit + polish

## 元 user fb (検収項目 #23)

> Settings dialog 全 audit + polish。
> PR #248 で AutostartToggle / HotkeyInput のみ。**全 dialog audit がまだ**。
> 各 widget の Settings dialog (Clock / SystemMonitor / EXE Folder / WatchFolder / FileSearch / Item / ClipboardHistory / Task / その他)
> 全 Settings tab (一般 / Library / 外観 / etc)
> 共通 checklist: ラベル ↔ input gap、placeholder 役割、配置順、入力方式最適化、validation、ボタン配置、キーボードナビ、サイズ統一

## 引用元 guideline doc

| Doc                                    | Section                                                  | 採用判断への寄与                             |
| -------------------------------------- | -------------------------------------------------------- | -------------------------------------------- |
| `docs/desktop_ui_ux_agent_rules.md`    | P1 操作可視化 / P2 即時反応 / P4 一貫性                  | switch UI / 同役割 button は同じ素材で統一   |
| `docs/l1_requirements/ux_standards.md` | §5 インタラクションフィードバック / §6-3 Settings dialog | role="switch"、focus-ring、サイズ            |
| `CLAUDE.md`                            | 「同じ機能 = 同じ icon + 同じラベル」                    | folder picker は全 widget で同じ Button 表現 |

## Audit 結果 (Settings dialog 全件、main HEAD = `db040aa` 時点)

### 1. Toggle の実装ばらつき (一貫性違反 = P4)

| 場所                                                  | 実装                                                     | 評価                |
| ----------------------------------------------------- | -------------------------------------------------------- | ------------------- |
| `Settings > 一般 > 自動起動` (AutostartToggle.svelte) | proper switch (button + role="switch" + thumb translate) | ✅ PR #248 で改修済 |
| `widget settings: ClockSettings` (4 toggle)           | 生 `<input type="checkbox">` h-4 w-4                     | ❌ 不整合           |
| `widget settings: SystemMonitorSettings` (3 toggle)   | 同上                                                     | ❌ 不整合           |
| `widget settings: ProjectsSettings` (auto_add)        | 同上                                                     | ❌ 不整合           |

→ **全 toggle を switch に統一**。共通 `Switch.svelte` を抽出し、AutostartToggle (個別 aria-label 持ち)・各 widget settings から再利用。

### 2. Folder picker button の実装ばらつき

| 場所                 | 実装                                                  |
| -------------------- | ----------------------------------------------------- |
| `ProjectsSettings`   | shadcn `Button variant="outline" size="sm"` ✅        |
| `ExeFolderSettings`  | 自前 `<button class="rounded... bg-surface-3...">` ❌ |
| `FileSearchSettings` | 同上 ❌                                               |

→ **全て shadcn Button に統一**。

### 3. 数値 input の clamp 漏れ (validation 不一致)

| 場所                                                   | clamp                                  |
| ------------------------------------------------------ | -------------------------------------- |
| SystemMonitor.refresh_interval_ms                      | ✅ `Math.max(min, Math.min(max, ...))` |
| FileSearch.depth / limit                               | ✅                                     |
| ExeFolder.scan_depth                                   | ✅                                     |
| ClipboardHistory.max_items / poll_interval_ms          | ✅                                     |
| **CommonMaxItemsSettings.max_items**                   | ❌ `\| \| 10` だけ、999 を弾けない     |
| **ProjectsSettings.max_items / git_poll_interval_sec** | ❌ 同上                                |

→ 全 number input に `Math.max(min, Math.min(max, ...))` を適用。ラベルにも `(min〜max)` 表記を追加。

### 4. WidgetSettingsDialog の title が generic

| 現状                        | 改善                                                  |
| --------------------------- | ----------------------------------------------------- |
| `<h3>ウィジェット設定</h3>` | `<h3>{WIDGET_LABELS[widget.widget_type]} の設定</h3>` |
| h3 に id なし               | id="widget-settings-title" + aria-labelledby          |

### 5. Placeholder の使い方不一致

- `ProjectsSettings.title` だけ `value="ウォッチフォルダー"` (default value、空のときも表示) → 他は `placeholder="..."` (空のときヒント)
- 統一: 全て placeholder のみ。実際の default 値は parseWidgetConfig 側で fallback。

### 6. ラベル ↔ input gap

- 各 widget settings で `<div class="space-y-1">` 統一済み ✅
- WidgetSettingsDialog の `<div class="space-y-4">` でセクション間 gap 統一 ✅

→ ここは既に一貫、変更なし。

### 7. Settings tab 側 (Settings > 一般 / Library / 外観 / etc)

- `SettingsPanel.svelte` の各 panel は専用デザイン、過去 PR #248 で polish 済
- OpenerSettings (PH-issue-024) は本 polish 規格に合わせて新設
- 既存に大きな不整合なし、本 plan ではスコープ外

## 修正方針 (採用案 A)

1. **新規 `Switch.svelte`** (`src/lib/components/common/Switch.svelte`)
2. ClockSettings / SystemMonitorSettings / ProjectsSettings の checkbox を `Switch` に置換
3. ExeFolderSettings / FileSearchSettings の自前 button を shadcn Button に置換
4. CommonMaxItemsSettings / ProjectsSettings の number input に clamp 追加 (label にも `(min〜max)` 表記)
5. ProjectsSettings.title は default value → placeholder に変更
6. ProjectsSettings.description にも placeholder「このウィジェットの目的」を追加
7. WidgetSettingsDialog の h3 に widget label を含める + aria-labelledby

## 棄却案 B: 「Settings dialog を全部書き直す」

- スコープ過大、user 「漏れ補完」要望に反する
- 本 plan は polish のみ、構造変更なし
- → 棄却

## 横展開 phase

| 領域                   | 影響                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------- |
| `Switch.svelte` (新規) | 共通 toggle、`aria-label` prop 受取り                                                 |
| ClockSettings          | 4 toggle 置換                                                                         |
| SystemMonitorSettings  | 3 toggle 置換                                                                         |
| ProjectsSettings       | 1 toggle + Button picker (既に shadcn 化済、変更最小) + clamp + placeholder           |
| ExeFolderSettings      | 自前 button → shadcn Button                                                           |
| FileSearchSettings     | 同上                                                                                  |
| CommonMaxItemsSettings | clamp 追加 + ラベル `(1〜100)`                                                        |
| WidgetSettingsDialog   | title + aria-labelledby                                                               |
| AutostartToggle        | 既に switch、変更なし (Switch component 抽出後も独自 aria-label の都合で個別実装維持) |

## 受け入れ条件

- [x] `Switch.svelte` 新規作成 + props (checked, onChange, aria-label, disabled)
- [x] Clock / SystemMonitor / Projects の toggle を Switch 化
- [x] ExeFolder / FileSearch の自前 button → shadcn Button
- [x] CommonMaxItems / Projects の number input に clamp 追加
- [x] Projects title は placeholder のみ
- [x] WidgetSettingsDialog title が widget 種類を含む
- [x] pnpm verify 全通過
- [ ] dev で目視: 各 widget Settings dialog で switch / button / number 挙動確認 (user 検収待ち)
