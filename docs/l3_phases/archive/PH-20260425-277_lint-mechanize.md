---
id: PH-20260425-277
status: todo
batch: 64
type: 品質防衛
---

# PH-277: lint/clippy ルール強化（規約の機械化）

## 背景・目的

CLAUDE.md / engineering-principles.md に書いてあったルールを「書くだけ」にしていた。機械が止める形に転換する。

## 作業内容

### biome.json ルール追加

```json
{
  "linter": {
    "rules": {
      "correctness": {
        "noUnusedImports": "error"
      },
      "complexity": {
        "noExcessiveCognitiveComplexity": { "level": "warn", "maxAllowedComplexity": 15 }
      },
      "suspicious": {
        "noConsoleLog": "warn"
      }
    }
  }
}
```

### Clippy allow-list 厳格化（src-tauri/）

`src-tauri/.clippy.toml` または `lib.rs` トップに:

```rust
#![warn(clippy::unwrap_used)]        // テスト外の unwrap を検出
#![warn(clippy::expect_used)]        // テスト外の expect を検出
#![deny(clippy::let_underscore_must_use)] // let _ = result; 禁止
```

テストコードは `#[cfg(test)]` ブロック内で例外許可。

### dependency-cruiser（フロント アーキ検証）

```bash
pnpm add -D dependency-cruiser
npx depcruise --init
```

ルール: `src/lib/state/` → `src/lib/components/` への import を禁止（stores から components への逆依存防止）。

`package.json` に `audit:arch` スクリプトを追加:

```json
"audit:arch": "depcruise src/lib --config .dependency-cruiser.json"
```

### pnpm audit スクリプト整備

```json
"audit:sec": "pnpm audit --prod --audit-level=high"
```

CI に `pnpm run audit:sec` を追加（prod only、high 以上で fail）。

## 成果物

- `biome.json` ルール追加
- `src-tauri/src/lib.rs` clippy warn 追加
- `.dependency-cruiser.json` 設定ファイル
- `package.json` に `audit:arch` / `audit:sec` スクリプト

## 受け入れ条件

- [ ] `console.log` が warn として検出される [P]
- [ ] `let _ = result;` が clippy で検出される [P]
- [ ] アーキ違反 import（state→component 逆依存）が audit:arch で検出される [P]
- [ ] `pnpm run audit:sec` が実行できて現状 0 件で通過する
- [ ] `pnpm verify` 全通過（ルール追加で既存コードが新たに fail しない）
