---
id: PH-20260426-379
status: done
batch: 84
type: 整理
era: Refactor Era / 簡素化フェーズ
---

# PH-379: 整理 + batch-85 性能フェーズ提案

## 横展開チェック実施済か

- 各バッチで実施している運用、dispatch-log 完走記録 + 次バッチ候補
- folder-map.md / refactoring-opportunities.md を簡素化フェーズ後に更新

## 仕様

- dispatch-log 完走記録（merge SHA / Refactor Era 進捗）
- folder-map.md 更新（簡素化フェーズ後の構造）
- refactoring-opportunities.md の batch-84 セクション追記（変更前後の LoC 比較）
- batch-85 性能フェーズの 5 plan 構成を提案:
  - PH-380 cargo bloat 上位 review + 不要 features 削減
  - PH-381 vite-bundle-visualizer + dynamic import で chunk 削減
  - PH-382 起動 P95 計測 + 改善（実測ベース）
  - PH-383 idle memory 計測（sysinfo Mutex 戦略 review）
  - PH-384 整理 + Polish Era 起動提案

## 完了ノート（batch-84）

batch-84 の完走サマリ:

- **PH-375 done**: WidgetSettingsDialog 解体（583 → 95 行）+ 7 dedicated Settings + 1 共通 + WidgetMeta.SettingsContent 集約
- **PH-376 deferred → batch-85/86 持越**: PH-375 の差分が大きく 1 PR の限度を超える判断
- **PH-377 done**: ConfirmDialog 共通化 3/3（WorkspaceLayout / LibraryDetailPanel / WorkspaceDeleteConfirmDialog）
- **PH-378 done**: 防衛テスト 15 件追加（ConfirmDialog 9 + registry 6）+ vitest 環境整備（svelteTesting plugin + matchMedia polyfill）
- **PH-379 done**: 本書 + dispatch-log + 次バッチ提案

batch-85 構成の修正提案:

- batch-84 で PH-376 が deferred になったため、batch-85 を「性能 4 + 整理 1（PH-376 消化）」または batch-86 として整理フェーズを別出しする
- 直近の判断は dispatch-log で行い、計測フェーズの結果（baseline）と PH-376 の優先度を見て決める

Polish Era 起動条件メモ:

- Refactor Era 4 batch（82/83/84/85）完了
- 直近 3〜4 バッチで新規ユーザ指摘ナシ（自律運用継続中）
- watched_folders deprecated 削除を Polish Era の最初の plan として配置
