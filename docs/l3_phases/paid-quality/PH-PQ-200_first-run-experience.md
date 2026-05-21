---
id: PH-PQ-200
status: planning
batch: paid-quality
type: 改善
era: Polish
parent: README.md
---

# PH-PQ-200: 初回体験 — 2 分で価値が伝わる Setup + Template + Import

## 問題

paid product の最初の関門は「**初回起動から 2 分で価値が伝わる**」 かどうか。 業界 onboarding ベストプラクティスでは「first value in 2-5 minutes」 が目安 ([Formbricks 2026 best practices](https://formbricks.com/blog/user-onboarding-best-practices) / [Toptal Onboarding UX Guide](https://www.toptal.com/designers/product-design/guide-to-onboarding-ux))。 Arcagate の現状はここに大きな gap がある。

### 現状 (fact 確認)

| Component                                        | LoC | 中身                                                                        |
| ------------------------------------------------ | --- | --------------------------------------------------------------------------- |
| `src/lib/components/setup/SetupWizard.svelte`    | 29  | 3 step indicator + StepHotkey/Autostart/Complete を順次表示するだけのシェル |
| `src/lib/components/setup/StepHotkey.svelte`     | 20  | hotkey 設定のみ                                                             |
| `src/lib/components/setup/StepAutostart.svelte`  | 27  | autostart toggle のみ                                                       |
| `src/lib/components/setup/StepComplete.svelte`   | 23  | 「完了」 button のみ                                                        |
| `src/lib/components/setup/OnboardingTour.svelte` | 142 | wizard 後の guided tour、 本体は未活用                                      |

つまり **SetupWizard は「OS 設定 3 件」 だけ**。 「Arcagate で何ができるのか」 「最初に何を試せばいいか」 が一切示されない。

### onboarding test fixture が真実を語る

`tests/fixtures/global-setup.ts:77` で 「CDP 接続して SetupWizard / Onboarding をスキップ」 と書かれている、 つまり **e2e ですら本番の setup 完走経路を通っていない**。 `tests/e2e/critical-path.spec.ts:59` には「SetupWizard 復活問題回避のため createWorkspace + deleteWorkspace を 2 件繰り返さない」 という回避コメントが存在 = SetupWizard まわりに脆弱性がある証拠。

### 競合と比べた gap

| 競合                                     | 初回体験                                                                                                                                                      |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Raycast for Windows beta (2025-12〜)** | 起動して即 `⌘Space` で全機能 demo、 Snippets / Quicklinks / Clipboard History の preset 多数 ([Raycast Changelog](https://www.raycast.com/changelog/windows)) |
| **PowerToys Run**                        | install して既に動く (zero-config)、 公式 modules で OS との繋ぎが既に preset                                                                                 |
| **Listary 6**                            | 5 step wizard + 即座にファイル検索可能 (\$24.95 paid)                                                                                                         |
| **Flow Launcher**                        | install 直後に plugin store から選んで build-your-own                                                                                                         |
| **Arcagate (現状)**                      | hotkey / autostart 設定だけ、 「何ができるか」 を示さない                                                                                                     |

**ここを改善しないと、 paid 価値が伝わる前に user が離脱する**。

## スコープ

1. **SetupWizard 完走経路の再設計** (3 step → 5 step、 「価値伝達」 を追加)
2. **プリセット Workspace テンプレート** (Dev / Creator / GTD / Gaming の 4 種、 user は 1 click で選択)
3. **他ランチャー import 経路** (PowerToys Run の plugin list / Flow Launcher の userdata / Windows Start Menu shortcut の一括取込)
4. **OnboardingTour の guided first-use** (Library / Workspace / Palette の 3 spot を実物に重ねて 30 秒で示す)
5. **e2e で完走経路を verify** (SetupWizard skip を外した実 setup path の e2e、 「2 分以内に first launch まで到達」 を CI gate)
6. **後から再実行可能** (Settings → 「セットアップを再実行」 entry)

## やらないこと

- アカウント / cloud sync (Non-goal、 `motivation.md` 確定)
- 「Tutorial を強制スキップ不可」 にはしない (業界 best practice = always skippable)
- 詳細な video / GIF 同梱 (バイナリサイズが膨らむ、 Web LP で外置きする)
- Microsoft Store 配布特化の onboarding (本 plan は OS 配布形態に依存しない)

## 具体タスク

### T1. SetupWizard を 5 step 構成へ拡張

現状の 3 step を以下の 5 step へ:

| Step                           | 目的                                                                      | 既存 component 活用                                        |
| ------------------------------ | ------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 1. ようこそ + 価値伝達 (30 秒) | 「Arcagate は何か」 を 3 行 + 既存 widget の static screenshot 3 枚で示す | 新規 `StepWelcome.svelte`                                  |
| 2. テンプレ選択 (30 秒)        | Dev / Creator / GTD / Gaming / 空白 から 1 つ選択                         | 新規 `StepTemplate.svelte` + T2 で実装する template seeder |
| 3. import 提案 (任意、 60 秒)  | 他 launcher / Start Menu shortcut の import を提案                        | 新規 `StepImport.svelte` + T3                              |
| 4. Hotkey + Autostart (既存)   | 1 step に統合、 上下 2 段で                                               | 既存 `StepHotkey.svelte` + `StepAutostart.svelte` を統合   |
| 5. 完了 → tour へ (10 秒)      | 「Ctrl+Shift+Space を試そう」 で本物の palette を呼ぶ                     | 既存 `StepComplete.svelte` 改修                            |

実装 file: `src/lib/components/setup/SetupWizard.svelte` (29 → ~80 LoC)、 各 step は子 component に分離。 step indicator は既存の `<div class="h-1 flex-1 rounded">` を 3 → 5 へ拡張。

### T2. プリセット Workspace テンプレート (4 種)

新規 file: `src-tauri/src/services/template_service.rs` (新規 module)

各 template は (a) workspace name (b) widget list (type + 初期 config + grid 位置) を JSON で同梱 (`src-tauri/templates/{dev,creator,gtd,gaming}.json`)、 `include_str!` でバイナリ埋め込み (foundation §2.3 「migration SQL を埋め込み」 と同 pattern)。

| Template | Workspace 名 | 含む widget (`WidgetType` from `src-tauri/src/models/workspace.rs:9-31`)                                                                |
| -------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Dev      | Development  | Favorites (terminals/IDEs) + Projects (folder watch) + ExeFolder (`C:\tools`) + Snippet (code snippets) + ClipboardHistory + FileSearch |
| Creator  | Creation     | Favorites (DCC tools) + ImageScrap (reference images) + FilePreview (style sheet) + QuickNote (ideas) + ClipboardHistory                |
| GTD      | Tasks        | DailyTask + QuickNote + Snippet + Stats + ClipboardHistory                                                                              |
| Gaming   | Play         | Favorites (game launchers) + ExeFolder (Steam library hint) + Stats + SystemMonitor                                                     |

新規 IPC command: `cmd_apply_template(template_id: &str) -> Result<WorkspaceId, AppError>` (`src-tauri/src/commands/workspace_commands.rs` に追加)

選択した template を Library に preset item として seed しない (「使い方の見本」 だけを workspace に渡す。 Library は user が手で育てる) — paid product として user data を勝手に増やさない原則。

### T3. 他ランチャー import 経路

`src-tauri/src/services/import_service.rs` (新規) で以下を実装:

| Source                         | パス                                                                                                                  | 取込内容                                                                                                                                       |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| PowerToys Run Bookmarks plugin | `%LOCALAPPDATA%\Microsoft\PowerToys\PowerLauncher\settings.json`                                                      | Bookmark item → Arcagate `url` item として import                                                                                              |
| Flow Launcher userdata         | `%APPDATA%\FlowLauncher\Settings\Plugins\*\Settings.json`                                                             | カスタム url / file shortcut                                                                                                                   |
| Windows Start Menu shortcut    | `%APPDATA%\Microsoft\Windows\Start Menu\Programs\*.lnk` + `%PROGRAMDATA%\Microsoft\Windows\Start Menu\Programs\*.lnk` | `.lnk` を parse、 exe item として import (icon 自動抽出 = 既存 `extract_item_icon` 経路 `src-tauri/src/services/item_service.rs:561` を再利用) |
| Listary 6 export JSON          | user が手動 export した JSON path を指定                                                                              | hot list を import                                                                                                                             |

`.lnk` parse は `lnk` crate (Cargo.toml に依存追加。 評価対象: `lnk-rs` 等の小型 crate、 `parselnk`)。 完全 import ではなく「**新規 item として候補に並べる、 user が ✓ で取り込み**」 にする (paid product 原則: user data を勝手に書き換えない)。

UI: `src/lib/components/setup/StepImport.svelte` (新規) に 4 source の checkbox + preview list + import button。

### T4. OnboardingTour の guided first-use

既存 `src/lib/components/setup/OnboardingTour.svelte` (142 LoC、 fact 確認済) を SetupWizard 完了直後に発火。

3 spot に焦点を当てる (各 30 秒、 合計 90 秒):

1. **Palette spot**: Ctrl+Shift+Space を促す → 実 palette が開いたら「OK、 type して検索」 hint。 type 中に preset template の Favorites widget item が候補に並ぶ
2. **Library spot**: 「ここが全アイテムの home」、 D&D zone を highlight、 任意の `.exe` を D&D する hint
3. **Workspace spot**: 「ここが毎日の起動 pad」、 Library card を D&D で widget へ移す hint

各 spot は **skip 可** (user 既知の場合)、 **後で見直す** ボタンで Settings から再生可。

実装: Svelte 5 runes で tour state (`$state` で current_spot)、 overlay は既存 `WidgetShell` の dim pattern を再利用。

### T5. e2e で完走経路を verify

`tests/fixtures/global-setup.ts:77` の 「setupComplete を skip」 を **2 mode** へ:

| mode        | env var                               | 用途                                              |
| ----------- | ------------------------------------- | ------------------------------------------------- |
| skip (現状) | `ARCAGATE_E2E_SKIP_SETUP=1` (default) | 既存 9 spec の前提を維持                          |
| run (新規)  | `ARCAGATE_E2E_SKIP_SETUP=0`           | 新 spec `tests/e2e/setup-wizard.spec.ts` のみ実行 |

新規 spec `tests/e2e/setup-wizard.spec.ts` で:

- SetupWizard 5 step を順次完走 (Welcome → Template (Dev) → Import (skip) → Hotkey+Autostart (default) → Complete)
- 完走後に Workspace に Dev template widget 6 種が並ぶことを assert
- OnboardingTour の 3 spot が順次表示されることを assert
- **total wall time < 120 秒** を assert (「2 分以内 first value」 を CI gate)

### T6. Settings に「セットアップを再実行」 entry

`src/lib/components/settings/SettingsGeneralPane.svelte` (305 LoC、 fact 確認済) に新規 row:

- 「セットアップを再実行」 button → `cmd_reset_setup_complete` → app reload で SetupWizard 再表示
- 横に「OnboardingTour だけ再生」 button (T4 の tour を単独で発火)

新規 IPC command: `cmd_reset_setup_complete` / `cmd_replay_onboarding_tour`

## 受け入れ条件

- [ ] SetupWizard 5 step が動作、 各 step 単独 manual test pass
- [ ] T2 4 template が apply 可能、 各 template apply 後の widget 配置を CDP screenshot で目視評価
- [ ] T3 PowerToys Run + Start Menu shortcut import が手元 fixture で動作 (`.lnk` 10 件 import を verify)
- [ ] T4 OnboardingTour 3 spot が実 palette / library / workspace 上で正しく highlight
- [ ] T5 e2e `setup-wizard.spec.ts` が pass、 完走 wall time < 120 秒 を CI assert
- [ ] T6 「再実行」 button が SetupWizard を再起動可能 (verify e2e)
- [ ] `audit-i18n-hardcode.sh` が 0 violations (新規 UI text 全件 i18n key 経由)
- [ ] `audit-labels.sh` が 0 violations (新規 button 全件 aria-label 付与)

## 工数感

| Task                         | 工数         | 依存       |
| ---------------------------- | ------------ | ---------- |
| T1 SetupWizard 5 step        | 2-3 日       | —          |
| T2 4 template + service      | 2-3 日       | T1         |
| T3 Import service (4 source) | 3-4 日       | — (並行可) |
| T4 OnboardingTour wiring     | 2 日         | T1         |
| T5 e2e setup-wizard.spec     | 1-2 日       | T1-T4      |
| T6 Settings 再実行 entry     | 0.5 日       | T1         |
| 合計                         | **1-2 週間** |            |

## 依存・着手順

1. **先行**: PQ-100 (panic 駆逐) を先に — setup 中 panic は致命的
2. **並行可**: PQ-700 i18n (template 同梱 JSON も i18n 対応で書く)
3. **後続**: PQ-300 craft sweep が SetupWizard まで対象に含める

## 横展開チェック

- **既存 SetupWizard skip が前提の e2e 9 件** (`tests/e2e/*.spec.ts`) は `ARCAGATE_E2E_SKIP_SETUP=1` で従来通り動作することを確認 (regression なし)
- Template 同梱 JSON は **product 自体の DB schema** へ影響しない (apply 時に workspace insert のみ)
- Import は 「**新規 item 提案 → user 確定**」 の二段。 既存 Library 直書きルートと混同しない

## 参照

- 業界 onboarding best practice: [Formbricks 2026](https://formbricks.com/blog/user-onboarding-best-practices) / [Toptal Onboarding Guide](https://www.toptal.com/designers/product-design/guide-to-onboarding-ux) / [Appcues In-App Onboarding](https://www.appcues.com/blog/in-app-onboarding)
- 競合 onboarding: [Raycast Windows changelog](https://www.raycast.com/changelog/windows) / [Listary 6 wizard](https://www.listary.com/) / [PowerToys Command Palette comparison](https://windowsforum.com/threads/powertoys-command-palette-0-93-fast-sleek-windows-launcher-vs-flow-raycast.378624/)
- 既存 SetupWizard fact: `src/lib/components/setup/*.svelte` (5 file 計 ~250 LoC)
- 既存 OnboardingTour: `src/lib/components/setup/OnboardingTour.svelte` (142 LoC)
- e2e skip fact: `tests/fixtures/global-setup.ts:77` / `tests/e2e/critical-path.spec.ts:59`
- 値踏み: [PRODUCT_VALUATION §3 Onboarding gap](../../../.claude/worktrees/upbeat-mclaren-8f3c55/docs/l3_phases/audit/PRODUCT_VALUATION_2026-05-21.md) §「SetupWizard 完走経路の e2e」
