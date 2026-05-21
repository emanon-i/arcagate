---
id: PH-PQ-600
status: planning
batch: paid-quality
type: 改善
era: Distribution
parent: README.md
---

# PH-PQ-600: 差別化 — 新 widget 企画 + 既存 widget polish sweep

## 問題

Arcagate の **wedge (差別化の刃)** は「**同一アイテムモデル (exe/url/folder/script/command) + Workspace + widget canvas**」。 これは:

- **Playnite** (game only) には無い
- **Listary** (file search only) には無い
- **Raycast** (macOS native、 Windows beta は extension store ベース) とは設計思想が違う
- **Rainmeter** (skin only、 launcher なし) には無い
- **PowerToys Run / Flow Launcher** (palette only、 widget なし) には無い
- **Stardock Fences** (\$9.99 アイコン整理 only) には無い

つまり Arcagate は **「Launcher の機能を持つ Desktop Environment」** として唯一無二の構造を持っている。 この差別化を user が体感するには **widget の質と幅** がそのまま製品力に直結する。

### 現状の widget (fact 確認 `WidgetType` enum + `src/lib/widgets/`)

15 widget 実装済:

| 起動 / 検索系                        | 情報系                | 創作 / 入力系                   | 補助 / システム               |
| ------------------------------------ | --------------------- | ------------------------------- | ----------------------------- |
| Favorites / Recent / Item / Projects | Stats / SystemMonitor | QuickNote / Snippet / DailyTask | ClipboardHistory / FileSearch |
| ExeFolder / ScriptFolder             |                       | ImageScrap / FilePreview        |                               |

「ランチャー」 寄りの 4 系統。 paid 価値の幅を出すには **「毎日 1 時間以上画面上で見る widget」** の追加が効く。

### 競合 widget 調査 (Web 調査結果)

**Rainmeter** ([29 best skins 2026 - RankRed](https://www.rankred.com/rainmeter-skins/) / [Macmyths Top 30 2025](https://macmyths.com/30-best-rainmeter-skins-in-2025-for-windows-11-10-8-7/)) の人気 widget:

- **Mond** — circular system meters + weather + music control (上位常連)
- **Monstercat Visualizer** — audio visualization (musics lovers 必須)
- **Monterey Suite** — 9 widget pack (clock / weather / system / music / WMP/AIMP/iTunes/Spotify/YouTube 統合)
- **Senja** — minimal clean widgets (productivity focused)
- **Sonder** — all-in-one (時計 / 天気 / system / network)
- **Omnimo** — tile dashboard
- **Advansity** — multilingual astro weather, world map

**Raycast Windows** ([Raycast Changelog](https://www.raycast.com/changelog/windows)) の native commands:

- Snippets (text expansion as you type)
- Quicklinks (URL parameter templates)
- Clipboard History (multi-modal)
- Hyperkey (key remapping、 2026-04 追加)
- Window Management
- AI commands (Pro tier)

**Pomodoro / 時間管理系** ([Reclaim 2026 best Pomodoro](https://reclaim.ai/blog/best-pomodoro-timer-apps) / [iTop Easy Desktop](https://www.itopvpn.com/desktop-tips/pomodoro-windows-app-7688)):

- Windows 11 native Focus Sessions (built-in、 OS 通知統合)
- Focus To-Do (Pomodoro + task manager + report)
- iTop Easy Desktop (widget 統合)
- Reclaim.ai (AI Pomodoro、 Slack/Calendar 統合)

**Calendar / countdown widget** ([Dolce countdown widgets 2026](https://thedolceway.com/blog/best-countdown-widget-for-desktop)):

- Momentum (countdown + daily focus prompt)
- FocusTimer (Pomodoro + 大局 countdown 並列)

## スコープ

### A. 新 widget 企画 (4-6 個、 Arcagate ならではの設計で)

「他で買えるなら他で買え」 を回避する設計指針:

1. **Arcagate の同一アイテムモデルと積算**: 単独 widget でなく、 Library item / Palette / 他 widget と相互運用
2. **「ランチャー機能と組み合わせるからこそ価値が出る**」 機能を選ぶ
3. **Rainmeter / Raycast から学ぶが模倣しない**: 統合された product として magnetic な体験

### B. 既存 widget polish sweep

直近 commit log に「widget chrome 関連で連続 3 PR」 (#535/#536/#537)、 「カード見た目設定モーダル 2 PR」 (#532/#534)、 lessons.md に「ClockWidget を 4 回 fix しても改善せず削除」 など、 widget polish の連続 fix 履歴が残る。 fresh-eye で **全 widget の chrome / 設定 modal / 状態遷移** を 1 度通しレビュー。

## やらないこと

- Plugin SDK (Rainmeter ini / Raycast extension の代替) — paid v1 範囲外 (PQ-500 T2 で決定)
- Web Embed widget の任意 URL 表示 (security capability 拡大要、 paid v1 では allowlist のみ)
- 既存 ClockWidget 復活 (lessons.md で「4 回 fix しても改善せず削除」 確定)

## 具体タスク

### A. 新 widget 提案 (5 候補、 推奨 4 つ実装)

各 widget について (a) 競合 differentiator (b) Arcagate 統合価値 (c) 実装路線 を具体に。

#### A1. Pomodoro Focus Widget (推奨実装)

**差別化**: 「Pomodoro 中は launcher / palette / Library への item launch を **focus session に記録**」。 「今日 Pomodoro 中に何を起動したか」 を Stats widget が時系列で残す。 Reclaim ai のような AI 介入なしに「自分の集中時間と起動アイテムの結びつき」 を可視化。

**実装**: `src/lib/widgets/pomodoro/` 新規

- WidgetType::Pomodoro 追加 (`src-tauri/src/models/workspace.rs:9-31` の enum)
- config: `{ work_min: 25, break_min: 5, long_break_min: 15, sound: "default"|"silent" }`
- 既存 `launch_service.rs` に hook を入れ、 Pomodoro 中の launch を `pomodoro_session_launches` table に記録 (新規 migration)
- Stats widget に「Pomodoro 集中時間 + その時間内の launch アイテム」 集計画面を追加
- 通知: OS native (`tauri-plugin-notification` 既存) で work end / break end を notify

#### A2. Calendar Glance Widget (推奨実装)

**差別化**: 「3 日先までの予定 + Arcagate Library item を Calendar event に bind」。 例: 「12:00 ミーティング」 event を click すると **Zoom shortcut を launch + ミーティング用 workspace に切替**。 これは Outlook / Google Cal の widget では絶対できない、 launcher と統合された Arcagate ならではの動線。

**実装**: `src/lib/widgets/calendar/` 新規

- WidgetType::Calendar 追加
- データソース: 第 1 段階は ICS file 読み込み (Outlook / Google Cal の export)、 第 2 段階で Microsoft Graph API 直結 (capability 拡大、 別 PR)
- config: `{ ics_paths: string[], days_ahead: 3, item_bindings: { event_id: item_id }[] }`
- click 動作: bound item があれば launch + workspace switch、 なければ original event を kalender app で open

#### A3. Now Playing Widget (Spotify / YouTube Music) (推奨実装)

**差別化**: Rainmeter Monstercat は audio visualization のみ、 Arcagate の Now Playing は **「今聴いてる曲」 を Library に snap (favorites として 1 click 追加)** + **playlist を Library tag として運用**。 「2025-11 に聴いた曲一覧」 が Library で時系列フィルタできる。

**実装**: `src/lib/widgets/now-playing/` 新規

- WidgetType::NowPlaying 追加
- データソース: Windows SystemMediaTransportControls API (built-in、 全 player 横断、 capability `media-control` 必要)
- config: `{ show_album_art: true, snap_button_visible: true }`
- snap: 「Library に追加」 button → 既存 `cmd_create_item` で url 形式の item として保存
- 制約: Spotify / YT Music / Apple Music 等 SMTC 対応 player のみ

参考: Windows API [SystemMediaTransportControls](https://learn.microsoft.com/en-us/uwp/api/windows.media.systemmediatransportcontrols)

#### A4. AI Quick-Ask Widget (推奨実装)

**差別化**: PowerToys には「Tool Runner」 がある、 Raycast には AI commands (Pro tier、 \$10/月) があるが、 Arcagate の AI Quick-Ask は **「ローカル ollama / lm-studio 経由」 + 「結果を Snippet widget へ pin」** の組み合わせ。 月額不要、 offline 可。

**実装**: `src/lib/widgets/ai-quick/` 新規

- WidgetType::AiQuick 追加
- データソース: 第 1 段階は ollama / lm-studio HTTP API (localhost:11434 等)、 第 2 段階で Anthropic / OpenAI / Bedrock の opt-in
- config: `{ endpoint: "ollama"|"lmstudio"|"openai"|"anthropic", model: "qwen3:8b"|..., prompts_preset: string[] }`
- 結果を Snippet widget へ 1 click pin (`SnippetWidget.svelte` の add path 経由)
- security: capability に http allowlist (localhost / 設定済 endpoint のみ)、 user 入力に PII 警告

#### A5. Web Embed Widget (allowlist 限定、 検討) — non-推奨で候補のみ

**差別化**: ChatGPT / Claude / Notion / Linear の web UI を widget として canvas に embed。 ただし WebView2 IFRAME は CSP 制約 + capability 拡大 + 信頼の同心円問題があり、 paid v1 では **allowlist 限定** (ChatGPT / Claude / Notion など major SaaS) で慎重に。

**判断**: paid v1 では実装見送り推奨、 v1.x の plus pack として別 plan で。 ただし spec を本 phase で 1 枚書いて保存。

#### 新 widget 共通の実装規格

- 全 4 widget で `_shared/types.ts` の `WidgetModule` interface を実装
- `index.ts` で `widgetType + meta + Component + SettingsContent` を export (既存 14 widget と同 pattern)
- a11y: PQ-300 完了基準を全 widget で満たす (axe / keyboard / focus / aria)
- i18n: ja / en 同時実装 (PQ-700 と統合)
- migration: `WidgetType` enum 拡張 + DB 既存 widget 互換性確認 (forward-only)

### B. 既存 widget polish sweep

#### B1. widget chrome 一貫性 (#535/#536/#537 の後継)

全 15 widget の WidgetShell / chrome / sort 帯 / settings modal / context menu を 1 表に並べて diff 取り:

| widget                           | header chrome | sort/filter 帯 | settings modal | context menu |
| -------------------------------- | ------------- | -------------- | -------------- | ------------ |
| Favorites                        | ✓             | —              | ✓              | ✓            |
| Recent                           | ✓             | —              | ✓              | ✓            |
| (… 15 件全列挙、 audit で埋める) |               |                |                |              |

diff があれば fix。 横展開 audit (CLAUDE.md `<critical-rule id="lateral-sweep">`)。

#### B2. widget 設定 modal の一貫性

`src/lib/widgets/*/(.+)Settings.svelte` を比較。 既存 `LibraryCardSettings.svelte` (`src/lib/components/settings/`) の刷新 (#534) で確立した「**共通 Modal / 罫線・枠削除 / 用語統一 / live 反映**」 を全 widget 設定 modal に横展開。

#### B3. widget 状態遷移の audit

各 widget で:

- empty state (アイテム 0、 watched_path 未設定、 config 不完全)
- loading state (DB 待ち、 fs walk 中)
- error state (path 不在、 permission denied、 network error)

を意図的に作って screenshot。 PQ-300 T2 で全画面 sweep と同 work、 widget 特化部分を本 phase で深堀り。

#### B4. widget 性能予算

各 widget で:

- mount → first paint ≤ 100ms
- 設定変更 → 反映 ≤ 50ms (instant-feedback rule `<critical-rule id="instant-feedback">`)

を T1 audit で計測、 違反は fix。 PQ-400 T4 の 100 widget 配置 perf と統合。

## 受け入れ条件

- [ ] A1-A4 4 widget が実装、 各々 e2e spec pass + axe pass (PQ-300 基準)
- [ ] A5 Web Embed widget は spec doc を `docs/l2_foundation/features/widgets/web-embed.md` として保存、 実装は別 plan
- [ ] B1 widget chrome 一貫性 matrix が doc 化、 全件 ✓
- [ ] B2 widget 設定 modal が 15 件すべて共通 Modal pattern 採用
- [ ] B3 全 widget で empty/loading/error 3 state が EmptyState/LoadingState/ErrorState 共通 component 採用
- [ ] B4 全 widget で mount / 設定変更 ≤ 50ms (instant-feedback)
- [ ] WidgetType enum migration が forward-only 維持、 DB inline test pass
- [ ] features/widgets/ に新 widget の spec doc 4 件追加

## 工数感

### A 新 widget

| Widget                   | 工数                 | 依存                              |
| ------------------------ | -------------------- | --------------------------------- |
| A1 Pomodoro Focus        | 1 週間               | PQ-300 / PQ-700                   |
| A2 Calendar Glance       | 1.5 週間 (ICS first) | PQ-300 / PQ-700                   |
| A3 Now Playing           | 1.5 週間 (SMTC)      | PQ-300 / PQ-700、 capability 拡大 |
| A4 AI Quick-Ask          | 1 週間 (ollama only) | PQ-300 / PQ-700                   |
| A5 Web Embed (spec のみ) | 0.5 日               | —                                 |

### B 既存 widget sweep

| Task                          | 工数                    |
| ----------------------------- | ----------------------- |
| B1 chrome 一貫性 matrix + fix | 2-3 日                  |
| B2 settings modal 横展開      | 3-4 日                  |
| B3 state 3 軸 sweep           | 2 日 (PQ-300 T2 と統合) |
| B4 perf                       | 1 日 (PQ-400 T4 と統合) |

### 合計

**A 直列**: 5 週間 (4 widget) / **B**: 1 週間 → **6 週間** (並行最大化で 4-5 週間)

## 依存・着手順

1. **先行**: PQ-300 (craft 基準) / PQ-400 (perf 基準) / PQ-500 (既存 widget 完全化) / PQ-700 (i18n parity) 完了後
2. **並行可**: A1-A4 4 widget は **完全独立**、 並列実装可能 (sub-agent or 並列 PR)
3. **後続**: なし、 本 phase が paid v1 の最終仕上げ

## 横展開チェック

- WidgetType enum 拡張で `audit-widget-coverage.sh` (Rust enum ↔ TS bindings ↔ i18n messages の 3 点同期) が新 widget でも 0 violations
- security audit: A3 Now Playing の SMTC / A4 AI Quick の HTTP allowlist が capability に正しく反映 (PQ-100 T2 panic-clean な base で)
- features doc を **真とする** 原則: 各新 widget の spec を先に書いてから実装 (PQ-500 T4 と同じ pattern)

## 参照

- 競合 widget 調査:
  - Rainmeter: [Rankred 29 best skins 2026](https://www.rankred.com/rainmeter-skins/) / [Macmyths Top 30 2025](https://macmyths.com/30-best-rainmeter-skins-in-2025-for-windows-11-10-8-7/) / [Beebom 25 skins 2026](https://beebom.com/rainmeter-skins/)
  - Raycast Windows: [Raycast Changelog](https://www.raycast.com/changelog/windows) / [Raycast Windows Alternatives 2026](https://raycast-discount-code.com/blog/raycast-windows-alternatives)
  - PowerToys: [PowerToys Command Palette 0.93](https://windowsforum.com/threads/powertoys-command-palette-0-93-fast-sleek-windows-launcher-vs-flow-raycast.378624/)
  - Pomodoro/Focus: [Reclaim 2026 best Pomodoro](https://reclaim.ai/blog/best-pomodoro-timer-apps) / [iTop Easy Desktop](https://www.itopvpn.com/desktop-tips/pomodoro-windows-app-7688) / [Windows 11 Focus Sessions](https://www.howtogeek.com/windows-pomodoro-timer-helps-with-my-productivity-but-its-not-perfect/)
  - Calendar / countdown: [Dolce countdown widgets 2026](https://thedolceway.com/blog/best-countdown-widget-for-desktop) / [iTop countdown widgets](https://www.itopvpn.com/desktop-tips/desktop-countdown-widget-7855)
- 既存 widget enum: `src-tauri/src/models/workspace.rs:9-31` (15 variant)
- 既存 widget registry: `src/lib/widgets/index.ts:1-24`
- features/widgets/ spec: `docs/l2_foundation/features/widgets/` (15 file)
- lessons (削除済 ClockWidget): [`docs/l2_foundation/lessons.md`](../../l2_foundation/lessons.md)
- 値踏み: [PRODUCT_VALUATION 差別化軸](../../../.claude/worktrees/upbeat-mclaren-8f3c55/docs/l3_phases/audit/PRODUCT_VALUATION_2026-05-21.md) §「同一アイテムモデル / Workspace + Widget canvas」
