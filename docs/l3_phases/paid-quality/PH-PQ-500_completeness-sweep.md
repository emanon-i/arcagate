---
id: PH-PQ-500
status: planning
batch: paid-quality
type: 防衛
era: Polish
parent: README.md
---

# PH-PQ-500: 完全性 — half-feature 撤去 / 完成 / 隠蔽の三択

## 問題

paid product としての最大の信頼破壊要因は「**動いていない機能が UI に見えている**」 こと。 user が click した後に「これ動かないんだ…」 と気づいた瞬間、 価格 \$10-25 の正当化は完全に消える。

### 現状 (fact 確認 + 過去 audit)

| 観測対象                                  | 件数                    | 現状                                                                                                           |
| ----------------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| `#[allow(dead_code)]` (Rust)              | 5 件 (Codex 値踏み実測) | 4 件は state struct / match arm の false positive、 残 1 件 `plugin_api/` は将来 plugin 用足場として意図的隔離 |
| `plugin_api/` モジュール                  | (path 確認 TODO)        | 「やる / やらない」 未確定 — paid product 視点では「隠す」 か「削除」 か「実装」 か                            |
| 「実装済で動かない」 UI option            | 6 件                    | WASTEFUL_PROCESSING_AUDIT_2026-05-19 W-4 で「sort_field: 'recent' 等」 が対処済、 ただし全件 sweep 未          |
| half-feature widget                       | (audit 未)              | 例: SystemMonitor の特定 metric / FilePreview の特定 file 形式 等                                              |
| TODO/FIXME/HACK/XXX (code, word-boundary) | **0 件** (Codex 実測)   | これは clean、 残るのは「未完だが TODO で残ってない」 機能                                                     |

「**動くと言っているのに動かない**」 は code 内 TODO よりも質が悪い (TODO は本人が「未完」 と分かっている、 半端機能は誰も気づかない)。 paid sales 前にここを sweep する必要がある。

### 値踏みの指摘

- Claude 値踏み M5 「Plugin API の有無確定」 が高優先で挙がっている
- Claude 値踏み L (low) 「Roaming sync (将来 - 撤回中)」 → Non-goal、 やらない確定だが UI に痕跡があれば消す
- WASTEFUL_PROCESSING W-4 「実装済で動かない UI option」 が item widget で 6 件 (一部対処済)

## スコープ

1. **全 component / widget / settings pane の「動くか」 audit** (動 / 半動 / 死)
2. **plugin_api/ 等の足場コードを「完成 / 隠す / 削除」 の 3 択** で確定
3. **UI に出ているが動かない option / button を全件 sweep** (sort / filter / shortcut すべて)
4. **既存 widget の機能契約 (foundation features/) と実装の diff を埋める**
5. **「未完で隠す」 ものは feature flag で gate** (CLAUDE.md `<critical-rule id="do-it-now-philosophy">` 「やるべきは今やる」 を遵守、 「将来 trigger」 は禁止)

## やらないこと

- 新機能の **追加** (これは PQ-600 widget expansion で別 phase)
- ドキュメント (features/) 自体の書き換え (実装側を合わせる、 doc を delete しない)
- 「rare な edge case でしか動かない」 機能の削除 (動くなら残す、 動かないなら fix)

## 具体タスク

### T1. 全機能 audit (動 / 半動 / 死)

`docs/l3_phases/paid-quality/audit/completeness-matrix.md` を新規作成。 軸:

| 領域          | 観測対象                                                                                                                                                                                                                                |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Screen        | Library / Workspace / Palette / Settings / Onboarding (5 screen)                                                                                                                                                                        |
| Widget        | Favorites / Recent / Projects / Item / Stats / QuickNote / ExeFolder / DailyTask / Snippet / ClipboardHistory / FileSearch / SystemMonitor / ImageScrap / FilePreview / ScriptFolder (15 widget、 fact 確認 `models/workspace.rs:9-31`) |
| Settings pane | General / Library / Appearance / Data / Updater / About (6 pane、 fact 確認 `src/lib/components/settings/`)                                                                                                                             |
| Cross-cutting | hotkey / autostart / theme / undo / search / D&D / context menu                                                                                                                                                                         |

各観測点で:

- **動 (working)**: 主要操作が一通り完走、 e2e or manual で確認済
- **半動 (partial)**: 一部 option / config が動かない、 specific input で fail
- **死 (dead)**: そもそも触れない / commented out / placeholder

agent dev (CDP attach) で 1 観測点 5-10 分 × 約 30 観測点 = 半日。

### T2. plugin_api/ 「やる / 隠す / 削除」 確定

`src-tauri/src/plugin_api/` (`#[allow(dead_code)]` 隔離されている) は **将来 plugin 用足場**。 paid v1 では 3 択:

| 選択           | 理由                                                                                          | コスト         |
| -------------- | --------------------------------------------------------------------------------------------- | -------------- |
| (a) 削除       | v1 で plugin 提供しない、 Raycast 級拡張は scope 外 (`motivation.md` Non-goals 確認)          | small          |
| (b) 残すが隠す | feature flag `--cfg arcagate_plugin_api` でビルド時除外、 配布 build に含めない               | small + 仕掛け |
| (c) 完成       | plugin SDK 設計 + ドキュメント + sample plugin (Listary 価格帯では plugin あり = paid 価値増) | big (3-4 ヶ月) |

paid v1 戦略上は (a) または (b)。 「やる」 にするなら別 plan (`PH-PQ-9XX_plugin-sdk.md`) を切る。

CLAUDE.md `do-it-now-philosophy` 原則: 「将来 trigger」 禁止 → **(a) 削除** または **(c) やる** の 2 択推奨。

本 T2 では (a) を default 推奨、 user 判断で (c) を別 plan に切り出す。

### T3. UI option の sweep (動かない option 撲滅)

T1 audit で 「半動」 と判定された option を全件 sweep:

| widget / setting           | 半動 option (T1 audit 結果を埋める) | 対処                             |
| -------------------------- | ----------------------------------- | -------------------------------- |
| 例: ItemWidget sort_field  | `recent` (W-4 で対処済の例)         | 完成 or 削除                     |
| 例: SystemMonitor metric   | (T1 audit で特定)                   | 完成 or hide                     |
| 例: ThemeEditor 高度 token | (T1 audit で特定)                   | 完成 or 「高度設定」 toggle 配下 |

各 option について:

- **完成**: 該当 service の実装を追加 (例: `sort_field=recent` の SQL ORDER BY)
- **削除**: enum variant から削る、 UI から消す、 model migration (DB 既存値を default に戻す migration)
- **隠す**: feature flag (`#[cfg(feature = "experimental")]`) で配布 build から除外、 dev build でのみ表示

### T4. 機能契約 (features/) と実装の diff

`docs/l2_foundation/features/widgets/*.md` (14 widget spec、 fact 確認) と実装の **契約 diff** を取る:

各 spec で「**やる**」 と書かれているが実装にない / 「**やらない**」 と書かれているが UI にある を全件抽出。 例:

- `features/widgets/system-monitor.md` の「やる」 list と `SystemMonitorWidget.svelte:462` (462 LoC) の機能 diff
- `features/widgets/item.md` と `ItemWidget.svelte:273`
- `features/backend/launcher.md` と `launch_service.rs:324`

audit 手段: agent が widget 1 件ずつ spec read + Component read + diff list 作成 (sub-agent 並列化、 14 widget × 5 min = 1 時間)。

diff は T3 と同じ 3 択で処理。

### T5. 「未完で隠す」 を feature flag で gate

T3 / T4 で「**隠す**」 と判定したものは:

- Rust 側: `#[cfg(feature = "experimental")]` で隔離、 `Cargo.toml` の `[features]` に `experimental` を定義、 default で OFF
- Frontend 側: `import.meta.env.DEV` でガード (dev でのみ表示)、 `vite.config.ts` で `__ARCAGATE_EXPERIMENTAL__` 等 define
- 配布 build (`pnpm tauri build`) では experimental OFF を強制 (`tauri build` の env で `--no-default-features` 等を chain)

「将来開放」 にしない (`do-it-now-philosophy`)、 隠すだけ。 必要になったら removing the flag で 1 行で open。

### T6. 「半端 button」 撲滅 audit script

新規 `scripts/audit-stub-action.sh`:

- frontend で onclick / onchange のハンドラが空関数 / `console.log` のみ / `// TODO` のみのものを検出
- Tauri command で `Ok(Default::default())` のみ返す stub を検出
- false-positive 除外 list 同梱、 CI で 0 violations を gate

横展開: 既存 audit script 群 (17 種) と同じ pattern。 `lefthook.yml` の `audit:all` step に追加。

## 受け入れ条件

- [ ] T1 completeness-matrix.md に全観測点記入、 動 / 半動 / 死の判定が file:line 紐付き
- [ ] T2 plugin_api/ の処理が確定 (削除 PR or 隠す PR or 別 plan へ)
- [ ] T3 半動 option すべて 「完成 / 削除 / 隠す」 で fix PR 紐付き
- [ ] T4 features/ ⇄ 実装 diff が widget 14 件分作成、 全件 fix PR 紐付き
- [ ] T5 「隠す」 と判定したものが feature flag で配布 build から除外 (`pnpm tauri build` の bundle 確認)
- [ ] T6 audit-stub-action.sh が 0 violations、 lefthook 統合
- [ ] `pnpm verify` 全段 pass、 axe (PQ-300 T4) regression なし

## 工数感

| Task                         | 工数                          | 依存                   |
| ---------------------------- | ----------------------------- | ---------------------- |
| T1 completeness audit        | 1 週間                        | PQ-300 T1 と同時実施可 |
| T2 plugin_api/ 確定          | 0.5 日 (削除) / 1-2 日 (隠す) | T1                     |
| T3 半動 option sweep         | 3-5 日                        | T1                     |
| T4 features diff (14 widget) | 3-4 日                        | T1                     |
| T5 feature flag 整備         | 1-2 日                        | T3 / T4                |
| T6 stub-action audit script  | 1 日                          | —                      |
| 合計                         | **1-2 週間**                  |                        |

## 依存・着手順

1. **先行**: PQ-300 craft sweep の T1 と 同時実施推奨 (audit checklist が重複、 1 sweep で 2 phase 分の data が取れる)
2. **並行可**: PQ-700 i18n (T4 の features diff で文言が消える widget は i18n key も削除)
3. **後続**: PQ-600 widget expansion (新 widget 追加前に既存 widget を完全にする)

## 横展開チェック

- 過去 audit (W-4 等で対処済の option) が **再発していないか** を T6 audit script で自動検出
- features doc を **真とする** 原則 — diff が出たら実装を doc に合わせる、 doc を実装に合わせない (CLAUDE.md `<critical-rule id="cite-guideline">` 系)
- 「やらない」 判定 (T4 で features doc が「やらない」 と書いてあるのに実装にある) は **lessons.md** に 1 行追記して再発防止

## 参照

- 既存 wasteful processing audit: [`docs/l3_phases/audit/WASTEFUL_PROCESSING_AUDIT_2026-05-19.md`](../audit/WASTEFUL_PROCESSING_AUDIT_2026-05-19.md) W-4
- 既存 features spec: [`docs/l2_foundation/features/widgets/`](../../l2_foundation/features/widgets/) (14 file)
- CLAUDE.md `do-it-now-philosophy`: `<critical-rule>` 経由で「将来 trigger」 禁止
- 値踏み: [PRODUCT_VALUATION Plugin API](../../../.claude/worktrees/upbeat-mclaren-8f3c55/docs/l3_phases/audit/PRODUCT_VALUATION_2026-05-21.md) M5 / [Codex §1 god module + 境界 DTO](../../../.claude/worktrees/gracious-leakey-504c9c/docs/l3_phases/audit/PRODUCT_VALUATION_CODEX_2026-05-21.md)
- WidgetType enum: `src-tauri/src/models/workspace.rs:9-31` (15 widget)
