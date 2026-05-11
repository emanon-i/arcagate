# A3 Target Architecture (index)

A1 audit (V1-V10) を A2 best practice (TR-1..4 / SV-1..4) にあてはめた **target shape** + **migration 戦略**。A4 (実行 phase) で順次 PR 化する。

策定時点: 2026-05-06。base: main `f035a40`。

## Scope

- backend `src-tauri/src/` の target shape (現状維持 + 微調整)
- frontend `src/lib/` の target shape (store class wrapper、component split)
- migration plan (P0-P3 順、独立 mergeable な PR list)

## 関連 doc

| File                   | 内容                                                                              |
| ---------------------- | --------------------------------------------------------------------------------- |
| `a3-backend-shape.md`  | backend target shape: subdir / 命名 / service struct / repository 整理            |
| `a3-frontend-shape.md` | frontend target shape: store class wrapper / component split / cache invalidation |
| `a3-migration-plan.md` | P0-P3 順の PR list、各 PR scope / 退行 risk / branch 命名 / merge 順序            |

## 全体方針

### G1: 大方針は **構造を保ったまま中身を直す**

- subdir 分離 (`commands/` / `services/` / `repositories/` / `models/` / etc.) は **維持**
- Yaak 方式の Cargo workspace + 多 crate 分割は **将来検討項目** (LOC 30k+ / build 5min+ になるまで保留、A2 TR-2 参照)
- 全面再構築はしない (各 PR が独立 mergeable な小さい変更を積む)

### G2: 規約 (CLAUDE.md `設計の固定枠`) に **完全準拠**させる

- `commands → services → repositories → DB` (逆禁止) — V1/V3 で違反。A3 で全解消
- repository 間相互参照禁止 — V2 で違反。A3 で全解消
- service struct + `tauri::State<'_, ServiceXxx>` 注入で command を thin layer 化 (A2 TR-3+TR-4)

### G3: frontend store は **class wrapper + 明示 invoke** に統一

- 単一 store の責務肥大 (V4) を class wrapper で 2-3 sub-store に split (A2 SV-1+SV-4)
- mutation 後の cache invalidation は `$effect` ではなく **明示 method invoke** (A2 SV-3)
- Context 化は test 容易性の必要性に応じて段階適用 (SSR-safe ではあるが、現 desktop app では必須でない)

### G4: 各 PR は **`refactor/*` branch + test gate auto-skip 下** で出す

- PR #339 (A0 v2) で導入済の branch-based skip 機構を活用
- 各 PR の動作検証は **agent dev + screenshot 自己評価** + Codex review が主軸
- test 系 (Cargo test / Vitest / e2e) は refactor 期間中 skip、refactor 完了後に再構築

### G5: 1 PR は **scope を絞る** (1-3 file 中心、最大でも sub-system 1 つ)

- V1 (9 file) のような大きい範囲は **service 単位で 3 分割**して順次 PR
- merge 順序の依存は明示 (V2 の row_to_item 移管 → V1 の service struct 化、等)

## migration の段階方針

詳細 PR list は `a3-migration-plan.md`。

| 段階          |     件数 | 内容                                    |
| ------------- | -------: | --------------------------------------- |
| P0 (CRITICAL) |     3 PR | V1/V2/V3 の規約違反を解消               |
| P1 (HIGH)     |     3 PR | V4/V5/V6 の肥大化 + invalidation を解消 |
| P2 (MID)      |     1 PR | V7/V8 の配置・命名整理 (統合可)         |
| P3 (LOW)      |     1 PR | V9/V10 の legacy + dead code (統合可)   |
| **合計**      | **8 PR** | (P0 の 1 件をさらに 3 分割すると 10 PR) |

## A4 (実行 phase) への接続

A4 は本 doc の `a3-migration-plan.md` の PR list を上から順に **user 確認後着手**。各 PR で:

1. `refactor/<scope>-<short>` branch を main から切る
2. scope 通りに実装
3. svelte-check / clippy / fmt / biome の type-check pass を確認
4. agent dev + screenshot で目視検証
5. Codex review で品質担保
6. push → PR
7. user 確認 → merge → 次 PR

最後に `refactor/restore-tests` PR で test 再構築 + skip 機構解除。

## 真ブロッカー候補 (将来発見しうる)

- V1 の service struct 化で `tauri::State` 多重注入が複雑化 → 単一 `AppServices` 構造体にまとめる選択肢を検討
- V4 の workspace store 分割で history と state の sync が壊れやすい → 慎重に test (refactor 完了後)
- V9 の DB migration (legacy item_id 削除) で既存 user の DB との互換性 → migration script で詰め替え必須

これらは A4 で具体的に当たった時点で判断。
