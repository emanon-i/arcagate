---
paths:
  - "docs/**/*.md"
---

# Docs authoring rules

`docs/` の doc を編集する時にロードされる。doc システムの層構造・SSOT 原則・正本の割り当ては
[AGENTS.md](../../AGENTS.md) と [docs/CLAUDE.md](../../docs/CLAUDE.md) を正本とする (ここでは再掲しない)。

## 禁止

- `status: done` の L0 / L1 / L2 doc を書き換えない (履歴 mutation)。削除・移設は `CHANGELOG.md` に記録する
- コードが正本の生値 (schema / token 値 / 関数シグネチャ / PRAGMA) を doc に再掲しない。
  doc には設計判断 (FK / CASCADE / index 戦略 / 非機能予算) を書く
