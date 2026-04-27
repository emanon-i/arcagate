# Dispatch Queue

batch の Active / Next Up / Completed を可視化。各 batch 着手時 / 完了時に必ず更新する (PH-435 で導入)。

## Active Batch

- **batch-108** Industrial Yellow theme overhaul (Arknights:Endfield UI 言語化採用)
  - branch: `feature/batch-108-industrial-yellow-plans` → 各 plan ブランチへ分岐予定
  - 8 plan 構成 (PH-486〜493)、user 仕様提示 (2026-04-28、ChatGPT 経由)
  - 仕様: `docs/l1_requirements/design/industrial-yellow-spec.md`

## In-Flight (auto-merge 待ち)

- (なし)

## Next Up (batch-108、Industrial Yellow theme overhaul)

- **PH-486**: Token 定義 (`--ag-primary` 蛍光イエロー / 黒地 / 白パネル / accent orange、既存 token system 拡張)
- **PH-487**: Halftone / dot-fade / hatch utility (CSS layer or Tailwind plugin)
- **PH-488**: Pill button + L-bracket + orange diamond marker components
- **PH-489**: White industrial paper panel components (既存 Card 系拡張)
- **PH-490**: 背景レイヤー (薄い等高線 + dot fade、AppShell 適用)
- **PH-491**: ホーム画面リデザイン (ラジアル + 傾いた card)
- **PH-492**: 既存 theme と切替可能に (Settings の「テーマ」section 拡張)
- **PH-493**: 既存全 widget / panel に Industrial Yellow 適用 (横展開)

## Held (ユーザ作業待ち、v0.2.0 リリース後も継続)

- **PH-455**: Updater pubkey 本番化 (PC 前到着時にユーザ鍵生成 + GitHub Secret 登録)
- **Authenticode 証明書**: Azure Trusted Signing 候補、ユーザ判断 + Microsoft Partner Center 申請待ち
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
3. Next Up は常に 3 個以上維持 (在庫切れ防止)
4. Completed は最新 5 件のみ保持 (古い batch は dispatch-log で参照)
5. **In-Flight 区分**: auto-merge 待ち PR を可視化、main 未反映の commit が積まれているフェーズ用 (PH-435 batch-95)
