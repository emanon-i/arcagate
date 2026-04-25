---
id: PH-20260425-287
status: todo
batch: 66
type: 改善
---

# PH-287: codex review を Library 系コードに適用 + 重要指摘の取り込み

## 参照した規約

- `~/.claude/skills/run-codex/SKILL.md`
- `arcagate-engineering-principles.md` §6 HICCUPPS（I Image: 業界標準と比較）
- batch-64 PH-278（前回 Codex 採用指摘修正）

## 背景・目的

`/run-codex` skill は既に運用実績あり（batch-64 で採用済）。batch-65 で Library カード周りを大改修した直後なので、外部 reviewer による独立確認が価値が高い。

## 仕様

### スコープ

```
src/lib/components/arcagate/library/
src/lib/components/settings/LibraryCardSettings.svelte
src/lib/state/config.svelte.ts (libraryCard 関連のみ)
```

### Codex 実行

```bash
OUT=$(mktemp /tmp/codex-review-XXXXXX.txt)
printf '%s' "Review src/lib/components/arcagate/library and src/lib/components/settings/LibraryCardSettings.svelte for bugs, logic issues, dead code, error handling gaps, type or contract mismatches, risky assumptions, and maintainability problems specific to the Svelte 5 runes idiom. Return at most 10 findings ranked by severity. For each finding include severity, file, line or location, short rationale, and suggested fix. Avoid long code quotes." \
  | codex exec \
    --sandbox read-only \
    --skip-git-repo-check \
    --ephemeral \
    -c model_reasoning_effort="medium" \
    -o "$OUT" \
    -C E:/Cella/Projects/arcagate/.claude/worktrees/interesting-engelbart-e6f255 \
    - > /dev/null 2>&1
cat "$OUT"
```

### 採用判定

各指摘について以下で振り分け:

- **採用**: 妥当性高 + 修正コスト低 → 本 Plan 内で fix
- **記録のみ**: scope 外 / 大規模 → dispatch-log の「次バッチ候補」に積む
- **却下**: 誤検知 / 採用不可 → dispatch-log に 1 行理由

### コミット粒度

採用した指摘 1 件ごとに 1 commit が原則（複数まとめても可）。コミットメッセージに `(codex finding: <severity>)` を付けて追跡可能に。

## 受け入れ条件

- [ ] Codex 実行 + 結果保存（`tmp/codex-review-batch66.txt` 等）[Operations]
- [ ] 採用 / 記録のみ / 却下を分けた採用判定が dispatch-log に残る [History]
- [ ] 採用指摘の修正コミットが追跡可能（messageに `codex finding`）[Structure]
- [ ] `pnpm verify` 全通過

## 自己検証

- Codex の指摘内容に対し、Claude 自身も同じ箇所を読んで判定の妥当性を確認
- 採用指摘の修正で既存 E2E が緑のまま
