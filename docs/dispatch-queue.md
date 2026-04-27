# Dispatch Queue

batch の Active / Next Up / Completed を可視化。各 batch 着手時 / 完了時に必ず更新する (PH-435 で導入)。

## Active Batch

- **batch-108 Phase A — Widget UX 細部修正 round 2**
  - branch: `feature/batch-108-plans-rest` → 各 plan 実装は別 branch
  - user fb (2026-04-28) 11 項目 + 緊急 picker fix + ClockWidget hotfix
  - dev session `claude/gracious-heisenberg-b890ff` で並走

## In-Flight (auto-merge 待ち)

- **PR #186** 緊急 picker fix (`hotfix/picker-card-width`、batch-108 PH-497 相当 + plan rename 同梱)
- **PR #187** ClockWidget hotfix (`hotfix/clock-widget-overflow`、batch-108 PH-498 相当)

## Next Up (batch-108 Phase A、PR #186/187 merge 後着手)

- **PH-486**: Widget 削除ボタン目立たせ
- **PH-487**: 全 widget 横スクロールバー禁止 audit (S/M/L 全サイズ、container query 含む)
- **PH-488**: タスク Widget 文字サイズ + 完了/未完了ツリー分割
- **PH-489**: 縦スクロールバー被り audit (`scrollbar-gutter: stable` 全 container)
- **PH-490**: WatchFolder 監視先変更で内容リセット + 名前+アイコン重なり/はみ出し
- **PH-491**: 全 widget/button/panel アイコン+文字列はみ出し禁止 + size 上限
- **PH-492**: WatchFolder 配置直後の既存アイテム残存 fix (state 初期化)
- **PH-493**: FileSearch 検索バー sticky + ArrowUp/Down 結果選択
- **PH-494**: Widget 編集モード = Obsidian Canvas 風 (pan + zoom + dotted grid + workspace 単位 persist)
- **PH-495**: Settings からズーム削除 (編集モード内に統合)
- **PH-496**: ウィジット切り替えボタン左上固定

## batch 構成 (4 batch 順次)

| batch                 | scope                                        | plan ID 範囲                           | status |
| --------------------- | -------------------------------------------- | -------------------------------------- | ------ |
| **batch-108 Phase A** | 横断的 fix (11 plan) + 緊急 hotfix 2 件      | PH-486-498                             | Active |
| **batch-109 Phase B** | Per-widget polish (各 widget 個別洗練)       | PH-499-506                             | Next   |
| **batch-110 Phase C** | Settings dialog form polish (各 dialog 洗練) | PH-507-514+                            | Future |
| **batch-111**         | Industrial Yellow theme overhaul             | PH-515-522 (旧 PH-486-493 から rename) | Future |

各 plan / batch 完走前に user fb 全文照合 → 項目別表で報告 → user OK で次へ (memory feedback_widget_editing_ux.md 24)。

## Held (ユーザ作業待ち、v0.2.0 リリース後も継続)

- **PH-455**: Updater pubkey 本番化 (PC 前到着時にユーザ鍵生成 + GitHub Secret 登録)
- **Authenticode 証明書**: Azure Trusted Signing 候補、Microsoft Partner Center 申請待ち
- **Microsoft Store 登録**: MSIX packaging 経由 (B ライン代替案)

## Completed (last 5)

- **batch-107**: Widget UX 全面改修 (PH-472〜479)、user fb 14 項目を 8 plan で fix、PR #175/176/181/182/184 merged。reactive 反映 7 E2E spec + helper + lessons.md パターン化。Polish Era 仕上げ
- **batch-106**: HTTP infra + Telemetry/Crash 実装 + LTO + Codex 5 Go 判定 (PH-465/466/469/470/471)、PR #173 + #174 merged → **Goal A 達成、v0.2.0 Go**
- **batch-105**: PH-464/467/468 Distribution Era Hardening (3 done + 2 deferred)、PR #172 merged
- **batch-104**: Distribution Era 設計 docs (PH-459〜463) + auto-kick 動作実証、PR #171 merged
- **batch-103**: Updater 自動チェック / readiness / rollback SOP (PH-456-458)、PR #170 merged

## 運用ルール

1. 着手時: Active Batch 行を更新、Next Up から消す
2. 完了時 (PR merge 後): Completed の最上段に追加、Active Batch をクリア、Next Up から次を移す
3. **完走宣言前**: feedback_widget_editing_ux.md + transcript 全 user fb 全文照合 → 項目別表で user 報告 → user OK 取得 (memory 24)
4. Next Up は常に 3 個以上維持 (在庫切れ防止)
5. Completed は最新 5 件のみ保持 (古い batch は dispatch-log で参照)
6. **In-Flight 区分**: auto-merge 待ち PR を可視化 (PH-435 batch-95)
