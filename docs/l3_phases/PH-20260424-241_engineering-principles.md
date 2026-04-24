# PH-20260424-241 arcagate-engineering-principles.md 新設

- **フェーズ**: batch-57 Plan C
- **status**: todo
- **開始日**: 2026-04-24

## 目的

`docs/l0_ideas/arcagate-engineering-principles.md` を新設する。内容は Dispatch が保管している確定ドラフトを使用する。

## 受け入れ条件

- [ ] ファイルが `docs/l0_ideas/arcagate-engineering-principles.md` として存在する
- [ ] 300 行以内、テーブル/箇条書き中心の構成である
- [ ] 以下 11 節が揃っている:
  1. 目的
  2. フロント/バックエンド分担の決定基準
  3. エラーハンドリング標準（IPC / DB / ファイル I/O）
  4. 可観測性（ログ）標準
  5. 依存予算（npm / cargo の上限感）
  6. テストピラミッド（vitest / E2E / Rust の棲み分け）
  7. リファクタ発動条件（LoC / 複雑度 / LCOM / CBO 閾値）
  8. 新規機能提案ゲート（凍結領域 / 既存 UX / パフォーマンス / テーマの 4 項チェック）
  9. 「毎日使える」のオペレーショナル定義
  10. セッション跨ぎ合意事項まとめ
  11. 参照リンク

## 実施手順

1. Dispatch へ「engineering-principles 完成ドラフトを送って」と送信
2. Dispatch が `/sessions/lucid-peaceful-dijkstra/arcagate-engineering-principles-draft.md` を read → 内容を 1 メッセージで返す
3. `docs/l0_ideas/arcagate-engineering-principles.md` として Write
