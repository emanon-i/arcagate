---
id: PH-20260426-379
status: todo
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
