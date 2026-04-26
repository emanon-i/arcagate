---
id: PH-20260427-380
status: todo
batch: 85
type: 改善
era: Refactor Era / 性能フェーズ
---

# PH-380: cargo bloat 上位 review + 不要 features 削減

## 参照した規約

- `docs/l0_ideas/arcagate-engineering-principles.md` §5「依存予算」上位制約: exe ≤ 20MB
- `docs/l1_requirements/vision.md` 非機能要求
- batch-82 計測フェーズ baseline: arcagate.exe 16.44 MB

## 横展開チェック実施済か

- batch-82 PH-368 で `cargo bloat --release --crates -n 30` を実行済
- baseline は performance-baseline.md に記録済、再計測の差分で改善判定
- 配布水準（`他人が使って問題ない水準`）の品質バーに対して、現状の 16.44 MB は十分小さいが、バンドル肥大の継続防止が目的

## 仕様

### 計測

```powershell
cd src-tauri
cargo bloat --release --crates -n 30 > tmp/cargo-bloat-batch85.txt
cargo bloat --release -n 50 >> tmp/cargo-bloat-batch85.txt
```

### 削減候補レビュー

batch-82 計測で大きかった crate を中心に:

- **windows / windows-core**: COM API 使用箇所を再確認、`Cargo.toml` の features を最小化
- **sysinfo**: `default-features = false` + 必要 features のみ（system / cpu / memory / disk）
- **reqwest**: 既に未使用なら除去候補（offline 完結設計）
- **serde / serde_json**: バージョン重複 (`cargo tree --duplicates`) チェック
- **tokio**: features の review、`rt-multi-thread` 不要なら絞る

### features 最適化

`src-tauri/Cargo.toml` の各依存に対して:

1. デフォルト features を確認
2. 実際に使う API のみ enable
3. `cargo build --release` で symbol 削減を確認

## 受け入れ条件

- [ ] `cargo bloat --release --crates -n 30` の baseline 比較を `docs/l2_architecture/performance-baseline.md` に追記
- [ ] 不要 features を 1 つ以上削減（または「削減対象なし」を明文化）
- [ ] arcagate.exe サイズが 16.44 MB から増加していない
- [ ] `pnpm verify` 全通過
- [ ] CI 緑

## SFDIPOT 観点

- **S**tructure: Cargo.toml の dep tree
- **F**unction: features 削減で実機機能に regression なし
- **T**ime: ビルド時間への影響（features 削減で短縮）
