---
id: PH-20260426-374
status: done
batch: 83
type: 整理
era: Refactor Era / 構造フェーズ
---

# PH-374: 整理 + batch-84 簡素化フェーズ提案

## 横展開チェック実施済か

- 各バッチで実施している運用、dispatch-log 完走記録 + 次バッチ候補
- folder-map.md / refactoring-opportunities.md を構造フェーズ後の状態に更新

## 仕様

- dispatch-log 完走記録（merge SHA / Refactor Era 進捗）
- folder-map.md 更新（widget folder colocation 後の構造）
- refactoring-opportunities.md の batch-83 セクション追記（変更前後の LoC 比較）
- widget-add-checklist.md 更新（folder-per-widget colocation 後は touch ファイル数 9 → 2）
- batch-84 簡素化フェーズの 5 plan 構成を提案:
  - PH-375 確認ダイアログ重複統合（ConfirmDialog 共通化）
  - PH-376 arcagate_cli.rs サブコマンド単位で分割
  - PH-377 item_repository.rs から tag 関連を tag_repository.rs に集約
  - PH-378 未使用 IPC export 6 件削除
  - PH-379 整理 + batch-85 性能フェーズ提案
