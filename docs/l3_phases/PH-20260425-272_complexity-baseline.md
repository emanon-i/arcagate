---
id: PH-20260425-272
status: todo
batch: 63
type: 計測
---

# PH-272: 複雑度ベースライン計測（LoC / fan-out / §7 閾値）

## 背景・目的

engineering-principles.md §7「リファクタ発動条件」で定義した指標（LoC / cyclomatic / fan-out / fan-in）の
現在値を計測し、閾値超過ホットスポットを特定してベースラインとして記録する。

## 計測内容

### LoC 計測（tokei）

```bash
# tokei インストール
cargo install tokei

# 言語別 LoC
tokei src/ src-tauri/src/

# ファイル別 LoC（上位確認）
tokei --sort code src/ src-tauri/src/ --files | head -40
```

§7 閾値: ファイル 500行 warning / 1000行 refactor

### fan-out 計測（madge）

```bash
# フロント: コンポーネント別 fan-out
npx madge --json src/ | node -e "
  const data = JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8'));
  Object.entries(data)
    .map(([f, deps]) => [f, deps.length])
    .sort((a,b) => b[1]-a[1])
    .slice(0, 20)
    .forEach(([f,n]) => console.log(n, f));
"
```

§7 閾値: fan-out 15 超 warning

### Rust cyclomatic complexity

```bash
# clippy で cognitive complexity を検出
cargo clippy -- -W clippy::cognitive_complexity 2>&1 | grep "cognitive_complexity"
```

### 既存知見（batch-59 batch-60 batch-61 の整理結果）

batch-59 の component-graph.md より上位:

- `LibraryDetailPanel.svelte`: 大型（batch-60 で分割実施済み）
- `WorkspaceLayout.svelte`: 大型（batch-60 で hook 抽出済み）
- `LibraryMainArea.svelte`: 大型（未整理）

## 成果物

- `docs/l2_architecture/complexity-baseline.md` 新設
  - 言語別 LoC テーブル
  - ファイル別 LoC top 20
  - fan-out top 10
  - §7 閾値超過リスト

## 受け入れ条件

- [ ] 言語別 LoC が計測・記録される
- [ ] ファイル別 LoC top 20 が記録される
- [ ] fan-out top 10 が記録される
- [ ] §7 閾値超過ファイルが特定される
- [ ] `pnpm verify` 全通過（計測のみ、コード変更なし）
