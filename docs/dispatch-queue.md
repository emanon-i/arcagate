# Dispatch Queue

batch の Active / Next Up / Completed を可視化。各 batch 着手時 / 完了時に必ず更新する (PH-435 で導入)。

## Active Batch

- **batch-109 — Widget core 改修 (Polish Era 本筋)**
  - user 検収完了 (Phase A 38 件 OK、GitWidget 簡素化 #34 のみ廃止)
  - user 強化指示「ウィジットがこのアプリの肝」「Obsidian Canvas のほぼコピー」「とことん」
  - 横断 7 plan (PH-499-505) + per-widget polish 8 plan (PH-506-513) = **15 plan**
  - **PH-503 Obsidian Canvas が最優先** (編集モード撤廃 + 即時保存 + Undo/Redo + Ctrl+0 + Fit + pan/zoom/transform)

## In-Flight (auto-merge 待ち)

- (なし)

## Next Up (Polish Era 仕上げ、Codex 6 までの確定 path)

### batch-109 横断 7 plan (PH-499-505)

- **PH-499**: Workspace per-workspace 背景壁紙 + Library 共通設定
- **PH-500**: WatchFolder Widget — 名前+アイコン被り解消 + はみ出し / layout 整理 (icon Folder → AppWindow 統合)
- **PH-501**: はみ出し audit warning → error 化 + 個別 fix
- **PH-502**: Workspace 表示領域 — 常時 viewport-fill (sidebar トグル化、PH-503 統合で scope 縮小)
- **PH-503** ⭐ **最優先**: Workspace = Obsidian Canvas (常時編集 / 即時保存 / Undo + 1:1 + Fit + pan / zoom / transform: scale / ミニマップ)
- **PH-504**: Per-item settings persistence (widget_item_settings table、案 C 論理削除なし)
- **PH-505**: Opener registry (Settings Openers + per-item override + 右クリック + SHOpenWithDialog)

### batch-109 per-widget polish 8 plan (PH-506-513)

- **PH-506**: ClockWidget polish
- **PH-507**: SystemMonitor polish
- **PH-508**: ExeFolderWatch polish (PH-500 後の本格 polish + opener 連動)
- **PH-509**: WatchFolder Settings polish (PH-490b + per-item settings 統合)
- **PH-510**: FileSearch polish (PH-493 後の本格 polish + opener 統合)
- **PH-511**: Item Widget polish (PH-497 picker fix 後の本体 polish)
- **PH-512**: ClipboardHistory polish (history list responsive、長文 truncate)
- **PH-513**: DailyTask polish (PH-488 完了/未完了ツリーを本実装 + polish)

### batch-110 Phase C — Settings dialog form polish 8 plan (PH-514-521)

- **PH-514**: General Settings polish
- **PH-515**: Library Settings polish
- **PH-516**: Appearance Settings polish (背景壁紙 PH-499 と整合)
- **PH-517**: Watched Paths Settings polish
- **PH-518**: Data Management Settings polish
- **PH-519**: Widget Dialog framework polish
- **PH-520**: Workspace Dialogs polish
- **PH-521**: Library Picker Form polish

### batch-111 Industrial Yellow theme overhaul 8 plan (PH-522-529)

- **PH-522**: tokens / **PH-523**: utilities / **PH-524**: buttons-markers / **PH-525**: paper-panel
- **PH-526**: background / **PH-527**: home-redesign / **PH-528**: theme-toggle / **PH-529**: widget-application
- 仕様: `docs/l1_requirements/design/industrial-yellow-spec.md`

### 廃止された plan (user 指示で不要)

- ❌ **GitWidget 簡素化** (旧 #34) — user fb「git 機能に不満なし、現状維持」、何も触らない

## batch 構成 (4 batch 順次)

| batch         | scope                                              | plan ID 範囲 | status              |
| ------------- | -------------------------------------------------- | ------------ | ------------------- |
| **batch-108** | Widget UX 細部修正 round 2 (16 plan)               | PH-486-498   | Done (検収完了)     |
| **batch-109** | Widget core 改修 (横断 7 + per-widget 8 = 15 plan) | PH-499-513   | **Active (着手中)** |
| **batch-110** | Settings dialog polish (8 plan)                    | PH-514-521   | Next                |
| **batch-111** | Industrial Yellow theme overhaul (8 plan)          | PH-522-529   | Future              |

各 plan / batch 完走前に user fb 全文照合 → 項目別表で報告 → user OK で次へ (memory feedback_widget_editing_ux.md 24)。

## Held (ユーザ作業待ち、v0.2.0 リリース後も継続)

- **PH-455**: Updater pubkey 本番化 (PC 前到着時にユーザ鍵生成 + GitHub Secret 登録)
- **Authenticode 証明書**: Azure Trusted Signing 候補、Microsoft Partner Center 申請待ち
- **Microsoft Store 登録**: MSIX packaging 経由 (B ライン代替案)

## Completed (last 5)

- **batch-108 Phase A**: Widget UX 細部修正 round 2 — 16 plan 全 main 反映 (PR #186-200)、user 検収完了 ✅ (38 件 OK、GitWidget 簡素化のみ廃止)
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
