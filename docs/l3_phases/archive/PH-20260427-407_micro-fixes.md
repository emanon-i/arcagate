---
id: PH-20260427-407
status: done
batch: 90
type: 改善
era: Polish Era / Use Case Audit
---

## 完了ノート

walkthrough（PH-406）で micro 摩擦 **0 件発見**。既存 batch-87/88/89 で:

- コピー統一（PH-393）
- LoadingState rollout（PH-401）
- 音声機能完全削除（PH-396）

を消化済みのため、新規 micro 修正対象なし。

---

# PH-407: walkthrough 中の軽微バグ / 不整合 即修正

## 仕様

PH-406 walkthrough で発見した micro 摩擦（1〜5 行で直る）を即修正。

修正対象（候補、walkthrough で確定）:

- 細かい文言ズレ
- aria-label / data-testid 不整合
- typo
- 軽い CSS / レイアウト調整
- 既存 lessons.md 違反箇所（lint で出てない既知 warning 系）

修正は同コミットに混ぜず、Plan 単位 commit:

```
fix(batch-90): PH-407 <case-id> <内容>
```

## 受け入れ条件

- [ ] walkthrough で発見した micro 摩擦を全て修正 or 「修正なし（摩擦なし）」と明記
- [ ] 修正は独立 commit、コミットメッセージで PH-407 + ケース ID
- [ ] `pnpm verify` 全通過
- [ ] 既存 e2e リグレッション 0
