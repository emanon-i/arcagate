# PH-20260425-253 改善候補優先度付きレポート

- **フェーズ**: batch-59 Plan E（整理系）
- **status**: done
- **開始日**: -

## 目的

PH-249〜252 の調査結果を統合し、
`docs/l2_architecture/refactoring-opportunities.md` に優先度付き改善候補をまとめる。

## 記載内容

1. **高優先**: 循環依存・レイヤー違反・未使用 crate（即修正対象）
2. **中優先**: ファンアウト過多コンポーネント（次回リファクタ対象）
3. **低優先**: LoC が大きいがテスト済みのファイル（監視継続）
4. **凍結**: リファクタしない意図的設計判断（`Mutex<Connection>` 等）

## 受け入れ条件

- [ ] `docs/l2_architecture/refactoring-opportunities.md` 存在
- [ ] 優先度 A/B/C/凍結でカテゴリ分けされた候補リスト
- [ ] batch-60 以降の整理系 Plan への入力として機能する
- [ ] `pnpm verify` 全通過
