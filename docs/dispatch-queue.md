# Dispatch Queue

batch の Active / Next Up / Completed を可視化。各 batch 着手時 / 完了時に必ず更新する (PH-435 で導入)。

## Active Batch

- **batch-107** Widget UX 全面改修 (Polish Era 仕上げ)、user 直接フィードバック起点
  - branch: `feature/batch-107-plans` → 各 plan ブランチへ分岐
  - 7 plan 構成 (改善 6 + 整理 1)、user dev session 並走中

## In-Flight (auto-merge 待ち)

- (なし)

## Next Up (batch-107 各 plan、Codex 5/Polish Era 完走に直結)

- **PH-472**: Widget Move/Resize/Delete ハンドル普通化 (editMode + 選択時のみ表示、shadcn 風 × button)
- **PH-473**: 衝突回避 + Grid 縮小 + Canvas 拡大 + Crop 機能 (auto-rearrange 廃止、無限風 canvas)
- **PH-474**: Item Picker = LibraryCard 再利用 + 複数選択 + Collection Widget + 削除 cascade
- **PH-475**: Font Token 化 + 全 widget 一括適用 + audit script (text-ag-{xs..2xl})
- **PH-476**: Window 半透明 (Mica/Acrylic) + Workspace 背景壁紙 (per-workspace + global)
- **PH-477**: Undo/Redo system (Ctrl+Z/Ctrl+Shift+Z、50 件履歴)
- **PH-478**: Widget 編集の状態管理整理 (draft / committed 分離、再編集で前 draft 残らない)

## Held (ユーザ作業待ち、v0.2.0 リリース後も継続)

- **PH-455**: Updater pubkey 本番化 (PC 前到着時にユーザ鍵生成 + GitHub Secret 登録)
- **Authenticode 証明書**: Azure Trusted Signing 候補、ユーザ判断 + Microsoft Partner Center 申請待ち
- **Microsoft Store 登録**: MSIX packaging 経由 (B ライン代替案)

## Completed (last 5)

- **batch-106**: HTTP infra + Telemetry/Crash 実装 + LTO + Codex 5 Go 判定 (PH-465/466/469/470/471)、PR #173 + #174 merged → **Goal A 達成、v0.2.0 Go**
- **batch-105**: PH-464/467/468 Distribution Era Hardening (3 done + 2 deferred)、PR #172 merged
- **batch-104**: Distribution Era 設計 docs (PH-459〜463) + auto-kick 動作実証、PR #171 merged
- **batch-103**: Updater 自動チェック / readiness / rollback SOP (PH-456-458)、PR #170 merged
- **batch-102**: PH-448 SBOM done + Codex 4 回目 → Polish 完走 No-go (PH-450 deferred)、PR #167 merged

## 運用ルール

1. 着手時: Active Batch 行を更新、Next Up から消す
2. 完了時 (PR merge 後): Completed の最上段に追加、Active Batch をクリア、Next Up から次を移す
3. Next Up は常に 3 個以上維持 (在庫切れ防止)
4. Completed は最新 5 件のみ保持 (古い batch は dispatch-log で参照)
5. **In-Flight 区分**: auto-merge 待ち PR を可視化、main 未反映の commit が積まれているフェーズ用 (PH-435 batch-95)
