---
id: PH-CF-500
status: planning
batch: clean-feedback
type: 改善
era: Distribution Hardening
parent: README.md
---

# PH-CF-500: 監視ウィジェット chrome 統一 + 設定デフォルト整合

## 元 user fb (検収項目)

- **D1**: EXE / フォルダ監視で sort バーの下にアイテムがめり込む (配置領域に sort 要素が重なる)。 スクリプト監視は正常
- **D2**: フォルダ監視の「配下フォルダ自動追加」 設定は不要。 表示件数・Git ポーリングも不要 → 削除
- **D3**: フォルダ監視ウィジェットだけ他 2 つと統一感がない
- **D4**: フォルダ監視にもデフォルト起動アプリ選択がほしい (VSCode / Blender 等で開く)
- **D7**: システムモニタ — ディスクが初回表示でゲージのはずがバーになる

## 用語

`projects` widget = user の言う「フォルダ監視」 (`index.ts` で `widgetLabel('projects')` → 「フォルダ監視」)。 「EXE 監視」 = `exe_folder`、 「スクリプト監視」 = `script_folder`。

## 問題

監視ウィジェット 3 種 (exe_folder / script_folder / projects) の chrome が prop レベルで不揃い (D1 / D3)、 projects に不要設定が残存 (D2)、 opener 選択が exe_folder にしか無い (D4)。 加えて system-monitor は widget 本体と settings で設定デフォルト値が二重定義され不一致 (D7)。 これは PH-PQ-600 widget polish sweep の取りこぼし (README §PH-PQ-600 取りこぼし分析)。

## 引用元 guideline doc

| Doc                                                          | Section                                 | 採用判断への寄与                   |
| ------------------------------------------------------------ | --------------------------------------- | ---------------------------------- |
| `docs/l2_foundation/features/widgets/_chrome-consistency.md` | widget chrome                           | 3 widget の prop レベル統一契約    |
| `docs/l2_foundation/features/widgets/projects.md`            | フォルダ監視                            | 不要設定の削除                     |
| `docs/l2_foundation/features/widgets/exe-folder.md`          | EXE 監視                                | opener 選択の規格                  |
| `docs/l2_foundation/features/widgets/system-monitor.md`      | システムモニタ                          | chart type の default              |
| `CLAUDE.md`                                                  | `<critical-rule id="lateral-sweep">`    | 3 widget を 1 グループで audit     |
| `CLAUDE.md`                                                  | `<critical-rule id="instant-feedback">` | 設定を開く前後で見た目が変わらない |

## Fact 確認 (root cause)

### D1: sort バー下のめり込み

3 widget とも sort バーは `class="ag-sticky-bar sticky top-0 z-10 ..."` で同一クラスだが、 決定的な差は **sort バー直後の list 要素と item 背景**:

- `script-folder` (`:250`) — `<ul>` の list item (`:254`) は **背景なし** (hover 時のみ `bg-surface-3`)。 透明 sticky bar (`ag-sticky-bar-bg` は blur テーマで `transparent`、 `arcagate-theme.css:107`) と重なっても見えない
- `exe-folder` (`:440-473`) — card モード時に `<ul>` の中に `<div class="grid">` を直接ネスト (不正な DOM)
- `projects` (`:425-431`) — card がデフォルト (`PROJECT_CONFIG_DEFAULTS.view_mode: 'card'`、 `:84`)。 grid item (`:431`) が **不透明背景** (`bg-surface-3`)。 スクロール時、 不透明 card が透明 sticky bar の裏に透けて重なって見える = めり込み

→ 「正常」 に見える script-folder は **item に常時背景が無いだけ** で、 透明 sticky bar 配下にスクロール内容が透ける問題そのものは未解決。 card を持つ widget で顕在化。

### D2: 不要設定 (すべて projects widget)

| 設定                                   | 定義箇所                                                                                                                                                    |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 配下フォルダ自動追加 `auto_add`        | `ProjectsSettings.svelte:51-60` (UI) / `:27` (型) / `index.ts` defaultConfig / `ProjectsWidget.svelte:258-278` ($effect で `folder://new-directory` listen) |
| 表示件数 `max_items`                   | `ProjectsSettings.svelte:63-80` / `:23` / `index.ts`。 **widget 本体で未使用 = 死に設定**                                                                   |
| Git ポーリング `git_poll_interval_sec` | `ProjectsSettings.svelte:82-101` / `:24` / `index.ts` / `ProjectsWidget.svelte:244-255` / `projects/git-poll.ts` + `git-poll.test.ts` 全体                  |

### D3: chrome の prop レベル差分

| 差分                    | exe_folder                | script_folder | projects                                         |
| ----------------------- | ------------------------- | ------------- | ------------------------------------------------ |
| WidgetShell `path` prop | `:314` 渡す               | `:169` 渡す   | `:294` **未指定** → 右クリックメニューが設定のみ |
| WidgetShell `icon`      | `AppWindow`               | `Terminal`    | `FolderKanban` (meta は `FolderOpen` で不一致)   |
| description 配置        | empty state の前 (`:317`) | 前 (`:172`)   | `{:else}` の中 (`:325`) → empty/error 時に出ない |
| config パース           | `JSON.parse` 直書き       | 同左          | `parseWidgetConfig` helper                       |
| default view_mode       | `'list'`                  | —             | `'card'`                                         |

### D4: opener 選択

`exe_folder` のみ `default_opener_id` を持つ (`ExeFolderSettings.svelte:120-142`、 launch 時 `ExeFolderWatchWidget.svelte:293/297` で `launchItemWithCascade` に `widgetDefaultOpenerId` 付与)。 `projects` は `ProjectsWidget.svelte:285` `launchItem(item.id)` の単純起動で opener なし。 opener registry (`opener_service` / `openersStore`) は既存流用可。

### D7: system-monitor の default 不一致

`SystemMonitorWidget.svelte:87` は `config.disk_chart_type ?? 'bar'`、 `SystemMonitorSettings.svelte:37` は `?? 'gauge'`。 クリーン状態 (config にキー無し) では widget 本体が `'bar'` にフォールバック = バー表示。 設定ダイアログを開くと UI は `'gauge'` を表示し、 保存で config に `'gauge'` が書かれて以降ゲージ。 cpu (`widget:85='bar'` / `settings:35='sparkline'`)、 memory (`widget:86='bar'` / `settings:36='sparkline'`) も同様にズレ。 widget 側コメントが「default を bar に統一」 と言っており settings 側の更新漏れ。

## スコープ

- 監視ウィジェット 3 種の chrome を prop レベルで統一 (D1 / D3)
- card を持つ全 widget の透明 sticky bar 透け問題を構造的に解決 (D1)
- projects の不要設定を削除 (D2)
- projects に opener 選択を展開 (D4)
- widget 設定デフォルト値を `index.ts` defaultConfig 一本に統一 (D7 + cpu/memory)

## やらないこと

- exe scanner の検出ロジック — PH-CF-400
- exe scan のキャッシュ / perf — PH-CF-900
- 監視 widget 以外の chrome 全面 sweep — PH-PQ-600 の範疇 (本 PH は監視 3 種 + system-monitor の default に限定)

## 具体タスク

1. **D1 sticky bar 透け修正**: card を持つ widget (`exe-folder` card mode / `projects` / `file-search`) の `ag-sticky-bar` に不透明 fill か backdrop blur を与え、 スクロール内容が透けないようにする。 `<ul>` 内 `<div grid>` ネストの不正 DOM も修正。 `ag-sticky-bar` を使う全ファイルを audit
2. **D3 chrome 統一**: projects の WidgetShell に `path` prop を渡す / `icon` を meta と一致させる / description disclosure を empty state の外へ移す。 config パースを 3 widget で揃える
3. **D2 不要設定削除**: `auto_add` / `max_items` / `git_poll_interval_sec` を UI・config 型・defaultConfig・関連 $effect・`git-poll.ts` + `git-poll.test.ts` ごと削除
4. **D4 opener 展開**: `ProjectsSettings.svelte` に exe と同じ opener select を追加、 `ProjectsWidget.svelte` の `handleLaunch` を `launchItemWithCascade(item, { widgetDefaultOpenerId: config.default_opener_id })` へ。 `index.ts` defaultConfig + config 型に `default_opener_id` 追加
5. **D7 default 統一**: `index.ts` の `defaultConfig` を唯一の出所にし、 `SystemMonitorWidget.svelte` と `SystemMonitorSettings.svelte` の `?? 'xxx'` を撤廃して両者が defaultConfig を参照。 cpu / memory / disk の 3 metric すべて

## 受け入れ条件 (機械検出)

- [ ] 監視 3 widget の chrome matrix を doc 化し、 WidgetShell prop (`path` / `icon`) / description 配置 / default view_mode が表で揃う
- [ ] audit script: card を持つ widget の sticky bar が不透明 fill を持つ (透明 + 不透明 card の組み合わせ 0)
- [ ] audit script: widget 本体の `?? default` と settings の `?? default` の二重定義 0 (defaultConfig 一本)
- [ ] projects から `auto_add` / `max_items` / `git_poll_interval_sec` の文字列が UI・型・config から消えている (grep 0)
- [ ] e2e: projects widget で opener を選択し、 選択 opener で起動される
- [ ] e2e / 手動: system-monitor を **クリーン config** で配置 → disk が初回からゲージ (settings を開く前後で表示が変わらない)

## 機能契約の追記

`features/widgets/_chrome-consistency.md`:

> **監視ウィジェット族契約**: exe_folder / script_folder / projects は同一の chrome 契約に従う。 WidgetShell に `path` prop を渡す / `icon` は `index.ts` meta と一致 / description disclosure は empty state の外。
>
> **sticky bar 契約**: card (不透明背景の item) を持つ widget の sort/filter sticky bar は不透明 fill または backdrop blur を持ち、 スクロール内容が透けてはならない。
>
> **設定デフォルト単一情報源契約**: widget の config default は `index.ts` の `defaultConfig` ただ 1 箇所で定義する。 widget 本体・settings の双方が defaultConfig を参照し、 `?? リテラル` のフォールバックを各所に書かない。

機械検出: (a) sticky bar 不透明チェック audit script、 (b) widget/settings の `?? default` 二重定義検出 audit script を新設し CI へ。

## 横展開

- chrome matrix は監視 3 種に限らず PH-PQ-600 で sweep した 15 widget の prop レベル再 audit のきっかけにする (本 PH では監視 3 種 + system-monitor を確実に、 他は doc に TODO 記録)
- `ag-sticky-bar` を使う widget 全件 (file-search 含む) を D1 の対象に
- opener 未対応の widget が他にないか (file-search 等) 確認

## 工数感

| Task                                | 工数     |
| ----------------------------------- | -------- |
| D1 sticky bar 修正 (全 card widget) | 1-2 日   |
| D3 chrome 統一                      | 1 日     |
| D2 不要設定削除                     | 0.5 日   |
| D4 opener 展開                      | 1 日     |
| D7 default 統一                     | 0.5 日   |
| audit script + test                 | 1-1.5 日 |

合計: 約 1 週間。

## 依存・着手順

- **先行**: PH-CF-400 (exe-folder settings を共有。 400 が拡張子 UI を足した後に 500 で chrome 整理)
- **後続**: なし

## 参照

- `src/lib/widgets/exe-folder/ExeFolderWatchWidget.svelte:314, 317, 367, 440-473` / `ExeFolderSettings.svelte:120-142`
- `src/lib/widgets/script-folder/` (`:169, 172, 220, 250, 254`)
- `src/lib/widgets/projects/ProjectsWidget.svelte:84, 244-255, 258-278, 285, 294, 325, 347, 425-431` / `ProjectsSettings.svelte:23-27, 51-101` / `projects/git-poll.ts`
- `src/lib/widgets/system-monitor/SystemMonitorWidget.svelte:85-87` / `SystemMonitorSettings.svelte:35-37`
- `src/lib/styles/arcagate-theme.css:107`
  </content>
