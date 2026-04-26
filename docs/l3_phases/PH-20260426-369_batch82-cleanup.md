---
id: PH-20260426-369
status: done
batch: 82
type: 整理
era: Refactor Era / 計測フェーズ
---

# PH-369: 整理 + batch-83 構造フェーズ提案

## 横展開チェック実施済か

- 各バッチで実施している運用、dispatch-log 完走記録 + 次バッチ候補
- Refactor Era 計測フェーズ完走を明確に記録、構造フェーズ着手条件を確認

## 仕様

- dispatch-log 完走記録（merge SHA / 各 baseline サマリ）
- 計測結果サマリ（folder-map / refactoring-opportunities / perf-baseline）を 1 ページにまとめて報告
- batch-83 構造フェーズの 5 plan 構成を提案:
  - PH-370 widget folder-per-widget colocation（PH-350 で deferred 済を着手）
  - PH-371 WidgetSettingsDialog 解体（PH-351 deferred 着手）
  - PH-372 components/library と components/workspace の責務再整理
  - PH-373 単体テスト
  - PH-374 整理 + batch-84 簡素化フェーズ提案
- ユーザ承認待ちで batch-83 着手
