---
id: PH-20260426-365
status: partial
batch: 82
type: 改善
era: Refactor Era / 計測フェーズ
---

# PH-365: 計測ツール準備（pnpm run audit:\* / cargo bloat 等）

## 横展開チェック実施済か

- engineering-principles §5「依存予算」で計測ツール一覧を既記載、本 plan で実機投入
- batch-79 で audit-widget-coverage.sh / audit-labels.sh の機械化パターン確立、同思想で audit:\* スクリプトも追加

## 仕様

### フロント側計測

- `pnpm run audit:bundle` → vite-bundle-visualizer / rollup-plugin-visualizer で treemap 出力
- `pnpm run audit:deps` → knip / depcheck で未使用 export 検出
- `pnpm run audit:cycles` → madge --circular でフロント循環依存検出
- `pnpm run audit:complexity` → eslint-plugin-sonarjs / cyclomatic-complexity で複雑度測定

### バックエンド側計測

- `pnpm run audit:rust-bloat` → `cargo bloat --release --crates -n 30` で size 寄与
- `pnpm run audit:rust-deps` → `cargo udeps --workspace` で未使用依存
- `pnpm run audit:rust-cycles` → `cargo depgraph` で循環依存

### 統合 audit

- `pnpm run audit:all` → 上記すべて実行 + 結果を `docs/l2_architecture/audit-output/` に保存
- 結果はコミットせず .gitignore（baseline は別 plan で記録）

### 受け入れ条件

- [ ] package.json に audit:\* scripts 追加
- [ ] 各 script が実行可能（手動 or CI）
- [ ] 結果出力ディレクトリ作成 + .gitignore
- [ ] `pnpm verify` 全通過（既存テストに影響なし）

### 注意

- **このフェーズはコード変更なし、ツール導入と script 追加のみ**
- 大型依存（cargo bloat / cargo-udeps 等）が不要に重い場合はオプション化
