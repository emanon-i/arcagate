---
id: PH-PQ-000
status: planning
batch: paid-quality
type: 統合
era: Polish → Distribution Hardening
---

# Paid Quality — Arcagate を「金を払う価値があるプロダクト」 に引き上げる L3 プラン集

> 「個人 daily-use OSS として既達 (B+/A-) だが、 売れる商品としては未達 (Codex 評 B)」 という二重判定 (Claude 値踏み 2026-05-21 / Codex 値踏み 2026-05-21) を起点に、 「機能数ではなく **6 つの品質次元** で paid product と無料 launcher の差をひっくり返す」 ことを目的にした計画集。
>
> 本 plan 集は **コード変更ゼロ docs のみ**。 各 phase は独立 plan として `_archive/PH-issue-NNN_*.md` の枠組みを踏襲。 実装着手は per-phase で別 PR。

---

## 動機 (なぜ今やるか)

### 値踏みの結論 (要約)

- **Claude 評**: 総合 B+/A-。 「設計層の成熟度が異様に高い、 ただし商用販売には 1〜2 ヶ月の polish が必要」 (`worktrees/upbeat-mclaren-8f3c55/docs/l3_phases/audit/PRODUCT_VALUATION_2026-05-21.md`)
- **Codex 評** (より厳しい): 総合 B。 主要 gap は (a) 本番経路に `.unwrap()` 682 件 / (b) E2E が IPC 直叩き寄りで UI 臨界経路の自動保証不足 / (c) a11y 自動検証なし / (d) capability 広い / (e) 同箇所 fix 累積 (直近 30 commit で fix 17 件) (`worktrees/gracious-leakey-504c9c/docs/l3_phases/audit/PRODUCT_VALUATION_CODEX_2026-05-21.md`)
- **業界文脈**: 2025 年後半に **Raycast for Windows public beta** 公開、 PowerToys Command Palette が AOT compile で速くなり、 「Windows 無料 launcher」 の質が急速に押し上がっている。 Arcagate が「ただの Windows launcher」 と認知された瞬間に競争に巻き込まれる

「**機能数を増やす**」 では既に無料勢に勝てない。 勝つには「**金を払う体験**」 と「**毎日使ってもらえる安心**」 を作る。 そこを 6 つの品質次元に分解して攻める。

### 6 つの品質次元 (user と合意した上位構造)

「動く個人ツール」 と「金を払うプロダクト」 の差は、 機能数ではなく以下 6 つで決まる:

| 次元              | 一行定義                                          | 主な phase                                                         |
| ----------------- | ------------------------------------------------- | ------------------------------------------------------------------ |
| 1. 信頼性 (体感)  | 落ちない / 固まらない / データを失わない          | [PQ-100 Reliability](./PH-PQ-100_reliability.md)                   |
| 2. 初回体験       | 最初の 2 分で価値が伝わる                         | [PQ-200 First-Run Experience](./PH-PQ-200_first-run-experience.md) |
| 3. 仕上げ (craft) | 全画面を fresh な目で通しレビュー、 a11y 本気対応 | [PQ-300 Craft Sweep](./PH-PQ-300_craft-sweep.md)                   |
| 4. 速さ           | 性能予算を全機能で守る、 重い I/O は background   | [PQ-400 Speed Budgets](./PH-PQ-400_speed-budgets.md)               |
| 5. 完全性         | half-feature を完成させるか隠す                   | [PQ-500 Completeness Sweep](./PH-PQ-500_completeness-sweep.md)     |
| 6. 差別化         | Workspace + widget canvas = wedge を磨く          | [PQ-600 Widget Expansion](./PH-PQ-600_widget-expansion.md)         |

加えて user 指示の 2 phase:

| 加点 phase                                                 | 目的                                                                                                                               |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| [PQ-600 Widget Expansion](./PH-PQ-600_widget-expansion.md) | 既存 15 widget を売り物レベルに磨き切る polish sweep + **Routine (マルチ起動) widget** 1 個。 generic 新 widget は不採用に組み替え |
| [PQ-700 i18n & Global](./PH-PQ-700_i18n-and-global.md)     | EN を ja と同格に。 文言 / デザイン文化中立化、 RTL 準備、 海外市場 a11y 要件遵守                                                  |

差別化軸は phase 6 だけでなく **全 phase に通底**。 例: PQ-200 の workspace template 提案は差別化 wedge を初回体験で見せる試み。 PQ-300 a11y は欧米有料商品の必須要件。

### 範囲外 (本 plan 集が **触らない**)

以下は別 PR / 別 plan で別途やる。 値踏みでは Critical 扱いだが「出荷の配管」 寄り作業のため、 本品質次元 plan とは独立で進める:

- updater pubkey 設定 (`tauri.conf.json:81` PLACEHOLDER → 本物の鍵)
- Authenticode 証明書取得 / Windows コード署名
- Microsoft Store 配布 / MSIX bundle
- 既存 telemetry / crash 報告の本実装 (PH-465/466 後続)
- 個人データ漏出履歴の `git filter-repo` (public 化判断時に別途)

これらは PR で別 trip。 本 plan 集は **product の中身** を磨く側に集中する。

---

## 推奨ロードマップ

「**信頼 → 初回体験 → 仕上げ → 速さ → 完全性 → 差別化**」 の順で着手する。 理由:

1. **信頼性 (PQ-100) を最初**: panic が残ったままで polish しても、 user が 1 度 crash したら全部水の泡。 信頼を担保してから他の改善に乗せる
2. **初回体験 (PQ-200) を 2 番目**: 「2 分で価値を伝える」 経路ができていなければ、 polish した品質が user に届かない。 sales funnel の入口を先に整える
3. **仕上げ (PQ-300) を 3 番目**: 信頼と初回体験の上に、 全画面の fresh-eye craft sweep + a11y を載せる。 海外売りの足切り条件 (WCAG 2.2 AA / 完全キーボード / SR)
4. **速さ (PQ-400) を 4 番目**: 体感は仕上げの一部だが、 1000+ items の virtualization 等 「機能 + perf」 案件は craft より大きいので分離
5. **完全性 (PQ-500) を 5 番目**: half-feature 一掃。 「金を取れない理由」 の整理。 PQ-300 の craft sweep で発見した「これ動いてない」 を集中処理する後工程
6. **差別化 (PQ-600 widget + PQ-700 i18n) を最後 / 並行**: 上 5 つで「信頼 + 初回 + 仕上げ + 速さ + 完全性」 が揃ってから、 product の wedge (Workspace + widget canvas) を伸ばす。 i18n は PQ-300 / PQ-500 と並行可能 (干渉が少ない)

### 着手順 (推奨)

| 順序 | Phase                       | 期間目安 | 並行可                 |
| ---- | --------------------------- | -------- | ---------------------- |
| 1    | PQ-100 Reliability          | 2-3 週間 | —                      |
| 2    | PQ-200 First-Run Experience | 1-2 週間 | PQ-700 と並行可        |
| 3    | PQ-300 Craft Sweep          | 3-4 週間 | PQ-700 と並行可        |
| 4    | PQ-400 Speed Budgets        | 2-3 週間 | —                      |
| 5    | PQ-500 Completeness Sweep   | 1-2 週間 | —                      |
| 6    | PQ-600 Widget Expansion     | 2-3 週間 | (PQ-300 完了後)        |
| 並行 | PQ-700 i18n & Global        | 2-3 週間 | PQ-200 / PQ-300 と並行 |

**総工数感**: 直列で 15-23 週間 (3.5-5.5 ヶ月)、 PQ-700 並行で 14-21 週間 (3-5 ヶ月)。 PQ-100 / PQ-200 / PQ-300 までで「**売れる品質の土台**」 が成立、 残りは sales 後の v1.x 継続改善でも回せる。

---

## 各 Phase 概要

### [PH-PQ-100 信頼性: panic 駆逐 + 故障時の自己修復](./PH-PQ-100_reliability.md)

本番経路の `.unwrap()` / `.expect()` をゼロ化、 DB 破損時の recovery 経路、 panic_hook + user dialog、 1h heavy soak の自動計測 fixture。 `src-tauri/src/lib.rs:137,173,175,212,368` / `src-tauri/src/services/file_search_state.rs:20,29,39` / `src-tauri/src/watcher/mod.rs:16,28` 等の現存 11 件を Result 連鎖へ。 clippy lint で再発防止。

### [PH-PQ-200 初回体験: 2 分で価値が伝わる Setup + Template](./PH-PQ-200_first-run-experience.md)

現状の SetupWizard 3 step (Hotkey / Autostart / Complete) を「**価値伝達導線**」 に作り替え。 プリセット Workspace テンプレート同梱 (Dev / Creator / Gaming / GTD)、 他ランチャー (PowerToys Run / Flow Launcher / Listary / Raycast) からの **import 経路**、 OnboardingTour の guided first-use。 `src/lib/components/setup/SetupWizard.svelte:1-29` (29 LoC) → 完走経路新設。

### [PH-PQ-300 仕上げ: 全画面 fresh-eye craft sweep + a11y 本気対応](./PH-PQ-300_craft-sweep.md)

全 5 screen × 17 widget = 85 観測点で「**毎日使えるか?**」 を再判定。 EmptyState / LoadingState / ErrorState / animation / 余白 / 文言の総ざらい、 WCAG 2.2 AA への準拠と CI 自動検証 (`@axe-core/playwright`)、 完全キーボード経路、 NVDA / Narrator での screen reader 動作確認。

### [PH-PQ-400 速さ: 性能予算を全機能で enforce + 大規模 N 検証](./PH-PQ-400_speed-budgets.md)

`docs/l1_requirements/vision.md` D1-D9 の数値予算 (起動 P95 ≤ 1500ms / palette P95 ≤ 120ms / Library 1000 items 60fps 等) を **per-PR CI gate** にする。 Library を 117 → 1000 / 5000 / 10000 へ拡張、 必要なら virtualization 導入。 `src-tauri/src/services/launch_service.rs` の DB lock 短縮等の wasteful processing 撲滅継続。

### [PH-PQ-500 完全性: half-feature 撤去 / 完成 / 隠蔽の二者択一](./PH-PQ-500_completeness-sweep.md)

`#[allow(dead_code)]` 5 件 / `plugin_api/` 足場 / 表示されてもデータがない UI option / 機能が中途半端な widget を全件 audit。 「**完成させる** / **隠す** / **削除**」 の 3 択で半端機能をゼロに。 paid product の最大の信頼破壊要因は「動いてない機能」。

### [PH-PQ-600 差別化: 既存 15 widget を売り物レベルに磨き切る + Routine widget](./PH-PQ-600_widget-expansion.md)

「Workspace + widget canvas」 wedge は、 既に持っている widget が「売り物の質」 に達してこそ user に届く。 既存 15 widget を fresh-eye で通しレビューし、 chrome 一貫性 / 設定 modal 共通化 / empty・loading・error 状態の質 / 性能予算 ≤50ms を磨き切る polish sweep がメイン。 新規 widget は half-feature にならない **Routine (複数 item を 1 クリックで一斉起動するマルチ起動) widget** 1 個のみ。 当初案の generic 新 widget (Pomodoro / Calendar / Now Playing / AI Quick-Ask / Web Embed) は「専用アプリに勝てない / half-feature リスク / 機能数より完成度」 の理由で不採用に組み替え。 パーソナル observability は PQ-800 (v2) の範疇。

### [PH-PQ-700 i18n & Global: EN を ja と同格に + 文化中立化](./PH-PQ-700_i18n-and-global.md)

`messages_en.json` は 909 key parity だが、 EN value は 30 件が ja 同一 / 1 件に日本語残存 (本 plan の audit で判明)。 「**parity OK**」 を「**EN として自然**」 に。 日付 / 数値 / 通貨 formatter のロケール対応、 RTL 準備、 文化中立 icon / wording / 色 (祝日色等の前提排除)。 欧米向け a11y 要件 (PQ-300 と連動)。

### [PH-PQ-800 パーソナル observability: 活動追跡 + システム履歴 × アイテムモデル相互強化](./PH-PQ-800_personal-observability.md) — **v2 (v1 リリース後)**

**v1 paid-quality sweep の scope 外**。 PH-PQ-700 完了 + GitHub への v1 リリース完了後に着手する v2 機能。 「ActivityWatch の見やすい版 + 個人スケールの軽量 observability」。 アクティブウィンドウ / メディア / ブラウザタブの活動追跡 + システムメトリクス履歴 + アプリ別リソース消費を、 Arcagate の item model (登録 item + tag) と相互強化させる。 構想記録のための plan doc であり、 PQ-100〜700 と異なり今は着手しない。

---

## 各 phase 共通の進め方

1. **fact 確認**: 該当 file:line を実 read、 引用元 guideline doc を明示 (CLAUDE.md `<critical-rule id="cite-guideline">` 参照)
2. **横展開 audit**: 1 file 直して終わりにしない、 同 pattern を grep で sweep (`<critical-rule id="lateral-sweep">` 参照)
3. **再現 + screenshot**: agent dev (CDP attach + `WEBVIEW2_USER_DATA_FOLDER` 隔離) で実機 reproduce、 before/after screenshot を Read で目視評価 (`<critical-rule id="dom-not-fixed">` 参照)
4. **受け入れ条件は測定可能**: 「品質を上げる」 のような抽象表現禁止、 「audit 0 violations」 「P95 < Xms」 等の数値 / 機械検出に落とす
5. **1 phase 1 PR シリアル**: 並行 PR 禁止 (`feedback_serial_pr_discipline.md` 2026-05-07 確定)

---

## 参照

- 値踏み: `worktrees/upbeat-mclaren-8f3c55/docs/l3_phases/audit/PRODUCT_VALUATION_2026-05-21.md` (Claude) / `worktrees/gracious-leakey-504c9c/docs/l3_phases/audit/PRODUCT_VALUATION_CODEX_2026-05-21.md` (Codex)
- 既存 L3 雛形: `docs/l3_phases/_template/use-case-audit.md`
- 既存 plan 例: `docs/l3_phases/_archive/PH-issue-024_opener-registry.md`
- 失敗駆動メモリ: `docs/l2_foundation/lessons.md`
- 商品仕様: `docs/l1_requirements/vision.md` (Part 2 release-criteria / Part 3 ux-standards)
- 過去 audit: `docs/l3_phases/audit/CODEX_AUDIT_2026-05-19.md` / `WASTEFUL_PROCESSING_AUDIT_2026-05-19.md` / `PERSONAL_DATA_LEAK_AUDIT_2026-05-20.md`
