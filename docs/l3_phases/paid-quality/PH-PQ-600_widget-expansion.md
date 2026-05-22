---
id: PH-PQ-600
status: planning
batch: paid-quality
type: 改善
era: Distribution
parent: README.md
---

# PH-PQ-600: 差別化 — 既存 15 widget を売り物レベルに磨き切る + Routine widget

## 問題

Arcagate の **wedge (差別化の刃)** は「**同一アイテムモデル (exe/url/folder/script/command) + Workspace + widget canvas**」。 これは:

- **Playnite** (game only) には無い
- **Listary** (file search only) には無い
- **Raycast** (macOS native、 Windows beta は extension store ベース) とは設計思想が違う
- **Rainmeter** (skin only、 launcher なし) には無い
- **PowerToys Run / Flow Launcher** (palette only、 widget なし) には無い
- **Stardock Fences** ($9.99 アイコン整理 only) には無い

つまり Arcagate は **「Launcher の機能を持つ Desktop Environment」** として唯一無二の構造を持っている。 ただし、 この差別化を user が体感できるかは **既に持っている widget が「売り物の質」 に達しているか**で決まる。 widget の数ではなく、 1 つ 1 つの完成度が製品力に直結する。

### 現状の widget (fact 確認 `WidgetType` enum + `src/lib/widgets/`)

15 widget 実装済 (`src-tauri/src/models/workspace.rs` の `WidgetType` enum 15 variant):

| 起動 / 検索系                        | 情報系                | 創作 / 入力系                   | 補助 / システム               |
| ------------------------------------ | --------------------- | ------------------------------- | ----------------------------- |
| Favorites / Recent / Item / Projects | Stats / SystemMonitor | QuickNote / Snippet / DailyTask | ClipboardHistory / FileSearch |
| ExeFolder / ScriptFolder             |                       | ImageScrap / FilePreview        |                               |

### scope の組み替え (当初案を見直した)

当初の PH-PQ-600 は「**generic 新 widget を 4-6 個追加**」 (Pomodoro / Calendar / Now Playing / AI Quick-Ask / Web Embed) する方向だった。 これを user 合意のうえ **組み替える**。 generic 新 widget は全て削除し、 本 phase の主眼を「**既存 15 widget を売り物レベルに磨き切る**」 に置く。

generic 新 widget を削った理由:

- **専用アプリ・専用サービスに勝てない**: Pomodoro は Focus To-Do / Windows Focus Sessions、 Calendar は Outlook / Google Calendar、 Now Playing は Spotify 本体、 AI Quick-Ask は ChatGPT / Claude のネイティブアプリ — いずれも本家の専用プロダクトが存在する。 widget として薄く作っても本家の体験には届かない
- **half-feature リスク**: 新 widget を一度に 5 個も足せば、 どれも中途半端になる。 PH-PQ-500 完全性 sweep でちょうど撲滅した half-feature を、 PH-PQ-600 で再生産することになる
- **値踏みレポートの原則と矛盾**: 値踏み (2026-05-21) の結論は「機能数では無料勢に勝てない、 勝つのは品質次元」。「**完成した少数機能 > 半端な多数機能**」。 generic 新 widget の追加は「機能数を増やす」 という無料勢の土俵に乗る動きで、 この原則に反する

→ 組み替え後の PH-PQ-600 = 「**既存 15 widget の polish sweep**」 をメインに据え、 新規 widget は half-feature にならない **1 個 (Routine widget) だけ**に絞る。

## スコープ

本 phase は 2 本立て。 メインは A の polish sweep、 新規追加は B の 1 個のみ。

### A. 既存 15 widget polish sweep (メイン)

全 15 widget を fresh-eye で 1 度通しレビューし、 「売り物の質」 に引き上げる:

- **widget chrome の一貫性** — header / sort・filter 帯 / settings modal / context menu の見た目と挙動を全 widget で揃える
- **設定 modal の共通化** — 15 widget の設定 modal を共通 Modal pattern に統一する
- **empty / loading / error 状態の質** — 全 widget で 3 状態を共通 component で、 説明的・気持ちよく見せる
- **widget 性能予算 (≤50ms)** — 設定変更 → 反映を `instant-feedback` rule 内に収める

直近 commit log には widget chrome 連続 3 PR (#535/#536/#537)、 カード見た目設定モーダル 2 PR (#532/#534)、 lessons.md に「ClockWidget を 4 回 fix しても改善せず削除」 — widget polish の連続 fix 履歴が残る。 場当たり fix を繰り返す代わりに、 ここで **全 widget を 1 度通しで仕上げ切る**。

### B. Routine widget (新規、 1 個のみ)

複数の Library item を束ねて **1 クリックで全部まとめて起動する**マルチ起動 widget。 例: 「開発開始」 routine = VS Code + ターミナル + Slack + 案件フォルダ を 1 ボタンで一斉起動。

これを唯一の新規 widget に選んだ理由:

- **軽い**: 既存の launch 経路 (`launch_service`) と item model にそのまま乗る。 新パラダイム・新 capability 不要
- **強い**: 「散在する起動元を 1 箇所に集約」 という Arcagate の core 価値を **そのまま増幅**する。 ランチャーと統合されているからこそ価値が出る、 wedge に忠実な機能
- **毎日効く**: 作業開始 / 終了の場面で毎日使う。 `daily-use-test` (CLAUDE.md 最上位 rule) を素で満たす
- **half-feature にならない**: 機能の輪郭が小さく明確 — 「item を束ねて一斉起動」。 完成ラインがはっきりしており、 中途半端になりようがない

## やらないこと

- **generic 新 widget (Pomodoro / Calendar / Now Playing / AI Quick-Ask / Web Embed)** — §scope の組み替え の理由により全て不採用。 当初案からの削除
- **パーソナル observability / Activity Insight 画面** — [PH-PQ-800](./PH-PQ-800_personal-observability.md) (v2、 v1 リリース後) の範疇に移設済。 本 phase では扱わない
- Plugin SDK (Rainmeter ini / Raycast extension の代替) — paid v1 範囲外 (PQ-500 T2 で決定)
- 既存 ClockWidget 復活 (lessons.md で「4 回 fix しても改善せず削除」 確定)
- widget の新規大量追加 — 「機能数を増やす」 方向には行かない (§scope の組み替え)

## 具体タスク

### A. 既存 15 widget polish sweep

#### A1. widget chrome 一貫性 (#535/#536/#537 の後継)

全 15 widget の WidgetShell / chrome / sort 帯 / settings modal / context menu を 1 表に並べて diff 取り:

| widget                           | header chrome | sort/filter 帯 | settings modal | context menu |
| -------------------------------- | ------------- | -------------- | -------------- | ------------ |
| Favorites                        | ✓             | —              | ✓              | ✓            |
| Recent                           | ✓             | —              | ✓              | ✓            |
| (… 15 件全列挙、 audit で埋める) |               |                |                |              |

diff があれば fix。 横展開 audit (CLAUDE.md `<critical-rule id="lateral-sweep">`)。

#### A2. widget 設定 modal の共通化

`src/lib/widgets/*/(.+)Settings.svelte` を比較。 既存 `LibraryCardSettings.svelte` (`src/lib/components/settings/`) の刷新 (#534) で確立した「**共通 Modal / 罫線・枠削除 / 用語統一 / live 反映**」 を全 widget 設定 modal に横展開し、 15 件すべてを共通 Modal pattern に揃える。

#### A3. widget 状態遷移の audit (empty / loading / error)

各 widget で:

- empty state (アイテム 0、 watched_path 未設定、 config 不完全)
- loading state (DB 待ち、 fs walk 中)
- error state (path 不在、 permission denied、 network error)

を意図的に作って screenshot。 PQ-300 T2 の全画面 sweep と同 work、 widget 特化部分を本 phase で深堀り。 3 状態とも `EmptyState` / `LoadingState` / `ErrorState` の共通 component を採用し、 説明的で気持ちのよい見せ方にする。

#### A4. widget 性能予算

各 widget で:

- mount → first paint ≤ 100ms
- 設定変更 → 反映 ≤ 50ms (instant-feedback rule `<critical-rule id="instant-feedback">`)

を audit で計測、 違反は fix。 PQ-400 T4 の 100 widget 配置 perf と統合。

### B. Routine widget (新規)

複数 item を束ねて 1 クリックで一斉起動するマルチ起動 widget を 1 個新設する。

- WidgetType enum に `Routine` を追加 (`src-tauri/src/models/workspace.rs` の enum)
- config: `{ items: item_id[], label: string, launch_delay_ms?: number }` — 束ねる item id 列、 表示名、 任意の起動間隔
- 起動経路は既存 `launch_service` をそのまま使う。 routine の各 item を順に launch する (新 launch 機構は作らない)
- item は登録済 Library item を参照 (id 参照)。 routine 専用の item 複製はしない — item の rename / 削除に追従する
- 1 件失敗しても残りの起動を止めない (1 つの起動失敗で routine 全体が止まらない)
- 削除 item を含む routine の扱い (stale id の skip + UI 表示) を定義する

#### Routine widget 実装規格

新規 widget 1 個ぶんの実装規格。 既存 14 widget と同じ枠に乗せる:

- `_shared/types.ts` の `WidgetModule` interface を実装、 `index.ts` で `widgetType + meta + Component + SettingsContent` を export (既存 widget と同 pattern)
- `WidgetType` enum 拡張は forward-only migration。 既存 widget の DB 互換性を確認
- a11y: PQ-300 完了基準 (axe / keyboard / focus / aria) を満たす
- i18n: ja / en 同時実装 (PQ-700 と統合、 「ja で merge、 en 後追い」 禁止)

## 受け入れ条件

- [ ] A1 widget chrome 一貫性 matrix が doc 化、 15 件全件 ✓
- [ ] A2 widget 設定 modal が 15 件すべて共通 Modal pattern を採用
- [ ] A3 全 widget で empty / loading / error 3 state が `EmptyState` / `LoadingState` / `ErrorState` 共通 component を採用
- [ ] A4 全 widget で mount ≤ 100ms / 設定変更 → 反映 ≤ 50ms (instant-feedback)、 違反 0
- [ ] B Routine widget が実装、 複数 item の 1 クリック一斉起動が動作、 1 件失敗で全体が止まらない
- [ ] B Routine widget で stale (削除済) item id が skip され、 UI に明示される
- [ ] B Routine widget が e2e spec pass + axe pass (PQ-300 基準)
- [ ] WidgetType enum migration が forward-only 維持、 DB inline test pass
- [ ] WidgetType enum 拡張で `audit-widget-coverage.sh` (Rust enum ↔ TS bindings ↔ i18n の 3 点同期) が 0 violations
- [ ] Routine widget の spec doc を `docs/l2_foundation/features/widgets/` に追加

## 工数感

### A. 既存 15 widget polish sweep

| Task                          | 工数                    |
| ----------------------------- | ----------------------- |
| A1 chrome 一貫性 matrix + fix | 2-3 日                  |
| A2 settings modal 共通化      | 3-4 日                  |
| A3 state 3 軸 sweep           | 2 日 (PQ-300 T2 と統合) |
| A4 perf                       | 1 日 (PQ-400 T4 と統合) |

### B. Routine widget

| Task             | 工数   | 依存            |
| ---------------- | ------ | --------------- |
| B Routine widget | 1 週間 | PQ-300 / PQ-700 |

### 合計

**A polish sweep**: 約 1.5-2 週間 / **B Routine widget**: 1 週間 → **約 2.5-3 週間** (A の各タスクは並行可能、 並行最大化でさらに短縮)。

## 依存・着手順

1. **先行**: PQ-300 (craft 基準) / PQ-400 (perf 基準) / PQ-500 (既存 widget 完全化) / PQ-700 (i18n parity) 完了後
2. **段階内**: A の polish sweep を先に通し、 既存 widget が売り物レベルに揃ったうえで B Routine widget を新設する。 A1-A4 は相互に独立で並行可能
3. **後続**: なし、 本 phase が paid v1 の widget 面の最終仕上げ

## 横展開チェック

- WidgetType enum 拡張 (Routine widget) で `audit-widget-coverage.sh` (Rust enum ↔ TS bindings ↔ i18n messages の 3 点同期) が 0 violations
- A2 設定 modal の共通化は 1 widget だけでなく **15 件全件**に適用 (CLAUDE.md `<critical-rule id="lateral-sweep">`)
- A3 の empty/loading/error 共通 component 化も 15 件全件 — 一部 widget だけ旧 state 表示が残らないこと
- Routine widget の起動経路は既存 `launch_service` を流用、 新 launch 機構を増やさない
- features/widgets/ doc を **真とする** 原則: Routine widget の spec を先に書いてから実装 (PQ-500 T4 と同じ pattern)

## 参照

- 既存 widget enum: `src-tauri/src/models/workspace.rs` (`WidgetType` 15 variant)
- 既存 widget registry: `src/lib/widgets/index.ts`
- widget 共通型: `src/lib/widgets/_shared/types.ts` (`WidgetModule` interface)
- features/widgets/ spec: `docs/l2_foundation/features/widgets/`
- 既存設定 modal の刷新 pattern: `src/lib/components/settings/LibraryCardSettings.svelte` (#534)
- lessons (削除済 ClockWidget): [`docs/l2_foundation/lessons.md`](../../l2_foundation/lessons.md)
- v2 の observability (本 phase 範囲外): [`PH-PQ-800 パーソナル observability`](./PH-PQ-800_personal-observability.md)
- 値踏み (「完成した少数機能 > 半端な多数機能」 の出典、 README §動機 参照): `worktrees/upbeat-mclaren-8f3c55/docs/l3_phases/audit/PRODUCT_VALUATION_2026-05-21.md` (Claude) / `worktrees/gracious-leakey-504c9c/docs/l3_phases/audit/PRODUCT_VALUATION_CODEX_2026-05-21.md` (Codex)
- 設計の固定枠 / 禁止事項: [`CLAUDE.md`](../../../CLAUDE.md)
