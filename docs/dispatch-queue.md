# Dispatch Queue

batch の Active / Next Up / Completed を可視化。各 batch 着手時 / 完了時に必ず更新する (PH-435 で導入)。

## Active Batch

- **batch-108 Phase A 完走 (検収中)** — 16 plan 全 main 反映済 (PR #186-199)
  - PH-486 / PH-487 / PH-488 / PH-489 / PH-490 / PH-490b / PH-490 E2E / PH-491 / PH-492 / PH-493 / PH-494 MVP / PH-495 / PH-496 / PH-497 hotfix / PH-498 hotfix / 起票 plan
  - 完走宣言済 + 項目別表 user 提示済、user OK 取得後 batch-109 着手
  - housekeeping (status 更新 + archive 移動 + log/queue 更新): `feature/batch-108-housekeeping` ブランチで実施

## In-Flight (auto-merge 待ち)

- (なし)

## Next Up (Polish Era 仕上げ、Codex 6 までの確定 path)

### batch-109 Phase B — Per-widget polish (起票済 8 plan)

- **PH-499**: Clock Widget polish
- **PH-500**: System Monitor Widget polish
- **PH-501**: ExeFolderWatch Widget polish (アイコン Folder → AppWindow、exe filter 等)
- **PH-502**: WatchFolder Settings polish (target reset + 表示 + 名前/アイコン重なり)
- **PH-503**: FileSearch Widget polish
- **PH-504**: Item Widget polish
- **PH-505**: ClipboardHistory Widget polish
- **PH-506**: DailyTask Widget polish

### batch-109 Phase B 追加 (memory 起点、未起票)

- **opener registry** (memory 27/28、Open with system / アイテム別 launch)
- **per-item settings persistence** (memory 29、widget_item_settings table、案 C: no logical delete)
- **GitWidget 簡素化** (status + branch のみ、user fb)
- **Obsidian Canvas pan/zoom/Shift drag/Middle button/Ctrl wheel/transform: scale** (PH-494 続き)
- **e2e 安定化** (PR #188 / #194 / #196 連続フレーキー対策、整理枠)

### batch-110 Phase C — Settings dialog form polish (起票済 8 plan)

- **PH-507**: General Settings polish
- **PH-508**: Library Settings polish
- **PH-509**: Appearance Settings polish
- **PH-510**: Watched Paths Settings polish
- **PH-511**: Data Management Settings polish
- **PH-512**: Widget Dialog framework polish
- **PH-513**: Workspace Dialogs polish
- **PH-514**: Library Picker Form polish

### batch-111 Industrial Yellow theme overhaul (起票済 8 plan、要リナンバリング)

- 起票済 plan ID は **PH-497-504 (industrial-yellow-*)** で **PH-497/498 hotfix と ID 重複**、batch-111 着手前に **PH-515-522** にリナンバリング必要
- PH-515 tokens / PH-516 utilities / PH-517 buttons-markers / PH-518 paper-panel
- PH-519 background / PH-520 home-redesign / PH-521 theme-toggle / PH-522 widget-application

## batch 構成 (4 batch 順次)

| batch                 | scope                                        | plan ID 範囲                           | status        |
| --------------------- | -------------------------------------------- | -------------------------------------- | ------------- |
| **batch-108 Phase A** | 横断的 fix (11 plan) + 緊急 hotfix 2 件      | PH-486-498                             | Done (検収中) |
| **batch-109 Phase B** | Per-widget polish (各 widget 個別洗練)       | PH-499-506 + opener/per-item/GitWidget | Next          |
| **batch-110 Phase C** | Settings dialog form polish (各 dialog 洗練) | PH-507-514                             | Future        |
| **batch-111**         | Industrial Yellow theme overhaul             | PH-515-522 (要 PH-497-504 から rename) | Future        |

各 plan / batch 完走前に user fb 全文照合 → 項目別表で報告 → user OK で次へ (memory feedback_widget_editing_ux.md 24)。

## Held (ユーザ作業待ち、v0.2.0 リリース後も継続)

- **PH-455**: Updater pubkey 本番化 (PC 前到着時にユーザ鍵生成 + GitHub Secret 登録)
- **Authenticode 証明書**: Azure Trusted Signing 候補、Microsoft Partner Center 申請待ち
- **Microsoft Store 登録**: MSIX packaging 経由 (B ライン代替案)

## Completed (last 5)

- **batch-108 Phase A**: Widget UX 細部修正 round 2 — 16 plan 全 main 反映 (PR #186-199)、user 検収中 (housekeeping PR 別途)
- **batch-107**: Widget UX 全面改修 (PH-472〜479)、user fb 14 項目を 8 plan で fix、PR #175/176/181/182/184 merged。reactive 反映 7 E2E spec + helper + lessons.md パターン化。Polish Era 仕上げ
- **batch-106**: HTTP infra + Telemetry/Crash 実装 + LTO + Codex 5 Go 判定 (PH-465/466/469/470/471)、PR #173 + #174 merged → **Goal A 達成、v0.2.0 Go**
- **batch-105**: PH-464/467/468 Distribution Era Hardening (3 done + 2 deferred)、PR #172 merged
- **batch-104**: Distribution Era 設計 docs (PH-459〜463) + auto-kick 動作実証、PR #171 merged

## 運用ルール

1. 着手時: Active Batch 行を更新、Next Up から消す
2. 完了時 (PR merge 後): Completed の最上段に追加、Active Batch をクリア、Next Up から次を移す
3. **完走宣言前**: feedback_widget_editing_ux.md + transcript 全 user fb 全文照合 → 項目別表で user 報告 → user OK 取得 (memory 24)
4. Next Up は常に 3 個以上維持 (在庫切れ防止)
5. Completed は最新 5 件のみ保持 (古い batch は dispatch-log で参照)
6. **In-Flight 区分**: auto-merge 待ち PR を可視化 (PH-435 batch-95)
