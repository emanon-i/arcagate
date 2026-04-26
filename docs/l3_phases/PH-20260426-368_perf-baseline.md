---
id: PH-20260426-368
status: done
batch: 82
type: 改善
era: Refactor Era / 計測フェーズ
---

# PH-368: 性能 baseline 計測

## 横展開チェック実施済か

- vision.md 制約: exe 20MB / idle 100MB / 起動 P95 2s
- engineering-principles §9「毎日使えるオペレーショナル定義」の数値記録未消化
- batch-73 で sysinfo 追加時に release exe size を一度測ったが、フル baseline はまだ

## 仕様

`docs/l2_architecture/performance-baseline.md` を新規作成:

### 1. exe size

- `cargo build --release --bin arcagate` 後の `target/release/arcagate.exe` サイズ
- vision 制約 20MB との差分

### 2. idle memory

- `pnpm tauri build` で生成された exe を起動、5 分待機後の RSS / Working Set
- `Get-Process arcagate | Select-Object WorkingSet,PrivateMemorySize`

### 3. 起動時間 P95

- ホットキー押下 → パレット表示までの計測（手動 5 回 → P95）
- 起動 → 初期 widget 表示までの計測

### 4. バンドルサイズ

- `pnpm build` 後の `build/_app/` の総サイズ
- 主要 chunk の treemap（vite-bundle-visualizer）

### 5. Rust hot path

- `cargo bloat --release --crates -n 30` の上位寄与 30 crates
- Tauri 自体の寄与を separate

### 6. テストスイート実行時間

- vitest: ファイル / テスト数 / 実行時間
- cargo test: テスト数 / 実行時間
- e2e: @core ファイル / 実行時間

## 受け入れ条件

- [ ] performance-baseline.md 全項目数値記録
- [ ] vision 制約との差分明記（達成 / 余裕 / 超過）
- [ ] 性能フェーズ（batch-85）改善対象の優先順位付け
- [ ] **コード変更なし**
- [ ] `pnpm verify` 全通過
