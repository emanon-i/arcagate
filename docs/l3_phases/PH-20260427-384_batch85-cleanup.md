---
id: PH-20260427-384
status: todo
batch: 85
type: 整理
era: Refactor Era / 性能フェーズ
---

# PH-384: 整理 + Polish Era 起動提案

## 参照した規約

- `docs/dispatch-operation.md` §3.4 完了処理
- `docs/l0_ideas/arcagate-engineering-principles.md` §9 主観オラクル → 客観指標
- batch-84 PH-379 で提案した Polish Era 起動条件メモ

## 横展開チェック実施済か

- 各バッチの整理枠と同じ運用、Refactor Era の最終バッチとして次 Era 提案も含む

## 仕様

### Refactor Era 完走記録

- batch-82 計測 → batch-83 構造 → batch-84 簡素化 → batch-85 性能 の 4 バッチ完走を dispatch-log に記録
- 計測前後の比較表を `docs/l2_architecture/refactoring-opportunities.md` に追記:
  - exe size
  - フロント raw / gzip
  - 起動 P95
  - idle memory
  - WidgetSettingsDialog LoC（583 → 95）
  - confirm dialog 重複行数（~270 → 1 + 2 wrappers）

### Polish Era 起動条件チェック

`docs/l0_ideas/arcagate_product_direction.md` の Polish Era 起動条件を再確認:

- Refactor Era 完走 ✓（本バッチで満了）
- 直近 3〜4 バッチで新規ユーザ指摘ナシ
- 配布水準を主張できる客観指標が揃った（exe / idle / 起動 / kbd / a11y）

### Polish Era 5 plan 提案

batch-86 候補:

- **PH-385** PH-376 deferred 消化（Settings/utils 配置整理 + SettingsPanel カテゴリ別分割）
- **PH-386** watched_folders deprecated 完全削除（Rust enum / WIDGET_LABELS / DB マイグレーション）
- **PH-387** /simplify レビュー指摘消化（NumberField 抽出 + shadcn Input 統一）
- **PH-388** Polish 防衛テスト（a11y / WCAG コントラスト 自動化）
- **PH-389** 整理 + Distribution Era 起動提案

## 受け入れ条件

- [ ] dispatch-log に batch-85 完走 + Refactor Era 完走を追記
- [ ] refactoring-opportunities.md に Refactor Era 計測比較表を追記
- [ ] Polish Era 起動可否判定を arcagate_product_direction.md に追記
- [ ] PH-385〜389 の plan 5 件を batch-86 として作成（ただし作成タイミングは Polish Era 起動承認後）
- [ ] `pnpm verify` 全通過

## SFDIPOT 観点

- **S**tructure: ドキュメント整合
- **H**istory（HICCUPPS）: 過去バッチとの計測比較で進捗を客観化
