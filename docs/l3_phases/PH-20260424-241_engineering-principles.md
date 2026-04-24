# PH-20260424-241 arcagate-engineering-principles.md 新設

- **フェーズ**: batch-57 Plan C
- **status**: done
- **開始日**: 2026-04-24

## 目的

CLAUDE.md の「必ず読む」テーブルに記載された `docs/l0_ideas/arcagate-engineering-principles.md` を新設する。
技術判断基準（フロント/バック分担・テスト・依存予算・リファクタ閾値）を一箇所に集約し、
`/simplify` 実行時や設計レビュー時の拠り所にする。

## 受け入れ条件

- [x] `docs/l0_ideas/arcagate-engineering-principles.md` が存在する
- [x] CLAUDE.md の「必ず読む」テーブルの行が有効なリンクになっている
- [x] レイヤー依存規則・エラーハンドリング・DB 設計・依存予算・テスト戦略・CSS 設計・パフォーマンス予算を網羅している
- [ ] pnpm verify が全通過する（docs のみ変更のため CI 確認で代替）
