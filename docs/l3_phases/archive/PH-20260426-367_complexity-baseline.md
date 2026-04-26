---
id: PH-20260426-367
status: done
batch: 82
type: 改善
era: Refactor Era / 計測フェーズ
---

# PH-367: 複雑度 / 重複 / 依存 baseline + ホットスポット top 10

## 横展開チェック実施済か

- engineering-principles §7「リファクタ発動条件」の閾値を実機で測定
- 構造フェーズ（batch-83）で潰すホットスポットを優先順位付けする入力

## 仕様

`docs/l2_architecture/refactoring-opportunities.md` を新規作成（更新形式 OK）:

### 1. LoC 計測

- ファイルごとの LoC 上位 30 件
- 関数ごとの LoC 上位 30 件
- フロント: cloc / `wc -l` で簡易計測
- Rust: `tokei` or `cloc`

### 2. Cyclomatic complexity

- フロント: eslint-plugin-sonarjs または同等 (svelte-check は対応していない)
- Rust: `cargo clippy -- -W clippy::cognitive_complexity` の出力を集計

### 3. 重複コード

- フロント: jscpd で 5 行以上 × 3 箇所以上の duplication 検出
- Rust: 同様

### 4. 循環依存

- フロント: madge --circular
- Rust: cargo depgraph

### 5. Fan-in / fan-out

- madge / cargo depgraph の数値で上位を抽出

### 6. ホットスポット top 10

- 上記指標を組合せ、「複雑度 × LoC × 編集頻度」でスコアリング、top 10 をテーブル化
- 各ホットスポットに「予想改善効果」「想定スコープ」を 1 行ずつ

## 受け入れ条件

- [ ] refactoring-opportunities.md baseline 数値記録
- [ ] ホットスポット top 10 テーブル
- [ ] 構造 / 簡素化 / 性能 各フェーズへの振り分け案
- [ ] **コード変更なし**
- [ ] `pnpm verify` 全通過
