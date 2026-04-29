---
id: PH-20260427-454
status: done
batch: 103
type: 整理
era: Distribution Era Hardening
---

# PH-454: version 3 点同期 + tag 前 audit (Codex 4 回目 Critical #2)

## 問題

Codex Rule C 4 回目 (PH-450) Critical #2: package.json 0.0.1 / Cargo.toml 0.1.0 / tauri.conf.json 0.1.0 で version 不整合。tag push 前に 3 点同期必須。

## 改修

- package.json version → 0.1.0 (Cargo.toml / tauri.conf.json と一致)
- scripts/audit-version-sync.sh 新設: 3 点比較 + 不整合なら exit 1
- .github/workflows/ci.yml に audit step 追加

## 受け入れ条件

- [x] package.json version 0.0.1 → 0.1.0
- [x] scripts/audit-version-sync.sh 新設 + chmod +x
- [x] CI workflow に audit step 統合
- [x] `pnpm verify` 全通過
