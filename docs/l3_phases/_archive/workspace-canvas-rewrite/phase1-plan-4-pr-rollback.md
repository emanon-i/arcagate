# §4 branch / PR 構成 / 検収 / rollback

## 4.1 branch 戦略

```
main (HEAD: c3eb4da PR #280 + a3xxxx PR #281)
  │
  └─ fix/zoom-rewrite-phase1   ← この PR で main から切る
       │
       ├─ C1 chore (stash pop)
       ├─ C2 feat (math anchor)
       ├─ C3 test (unit 分割 + cursor)
       ├─ C4 refactor (widget-zoom)
       ├─ C5 refactor (config)
       ├─ C6 refactor (layout)
       ├─ C7 test (e2e)
       └─ C8 docs (spec)
```

- **branch 名**: `fix/zoom-rewrite-phase1`
- **base**: main (PR #281 反映後の最新)
- **直 push 禁止**, PR 経由 squash merge

## 4.2 PR 構成

### 単発 PR (推奨)

理由:

- C1〜C8 は **論理単位 1 個** (zoom math 書き直し)
- 途中 commit を merge すると pure function の caller が古いまま broken state に
- 8 commit を 1 PR で squash merge → main は 1 commit ぶんしか増えない
- revert 単純 (1 commit revert で完全に戻る)

**PR title**: `fix(zoom): Phase 1 書き直し (Reset = viewport-center anchor + Fit = BB center + 二重 clamp 撤廃)`

**PR body 構成**:

1. **Summary**: 業界標準 (Excalidraw / tldraw / Figma / Miro / Obsidian) に揃える Phase 1 の書き直し
2. **背景**: post-redo3-7 user 検収「拡大率リセットも Fit も挙動おかしい」、業界調査 (4 agent) 結果反映
3. **Phase 1 spec** (Q1-Q5 の確定事項)
4. **Commits** (C1-C8 の概要表)
5. **検証**: vitest 新 25 ケース / e2e 修正 1 + 追加 3 / 実機 5 シナリオ screenshot / Codex review
6. **退行 risk matrix** (8 risk → 検出方法)
7. **検収シナリオ 5 件** (user dev 検収用)
8. **rollback 手順** (1 commit revert)

**注**: PR description に [phase1-plan-3-verification.md](./phase1-plan-3-verification.md) の matrix を貼って、各 risk の対処を可視化。

### 単発 PR にしない場合

万が一 stash@{0} pop で main との conflict が深刻だった場合のみ:

- PR-A: C1 (stash pop + conflict 解消) を先行 merge → main の build 維持
- PR-B: C2-C8 を後から積む

→ Phase 1 では **このパターンになる確率は低い** (PR #281 が ItemSettings + format-meta で zoom 領域に触っていない)。

## 4.3 user 検収シナリオ 5 件 (PR description にも転記)

PR merge 後、user に dev で実機検証をお願いする内容:

### A. wheel zoom cursor anchor

1. workspace に widget 1 個追加
2. mouse を widget の center に置く
3. **Ctrl+wheel up を 3 回** (zoom 130%)
4. **期待**: widget が cursor 下から離れない

### B. Reset zoom (Ctrl+0)

1. zoom を 50% に下げる + scroll を中央付近に pan
2. widget A が viewport 中央付近に見える状態
3. **Ctrl+0**
4. **期待**: zoom = 100%、widget A は viewport 中央付近のまま (viewport 端に飛ばない)

### C. Fit-to-content (Ctrl+Shift+1)

1. widget を 5 個 散らして配置 (col 0-7 × row 0-10)
2. zoom 200% で scroll 端に pan
3. **Ctrl+Shift+1**
4. **期待**: zoom 自動調整 (50-100% 程度)、全 widget が画面内に表示、BB center が viewport 中央

### D. workspace 切替で BB center 起点 (新仕様)

1. workspace A に widget 配置済 → Ctrl+0 で zoom 100% にする
2. workspace B (空) に切替 → 戻ってくる
3. **期待**: workspace A に戻ったとき widget が viewport 中央付近に見える
   (旧: 左上スタートで widget 見えない / 新: BB center scroll)

### E. 73% zoom (5 単位でない)

1. zoom 100% から Ctrl+wheel down × 3 (zoom 70%)
2. Ctrl+wheel up × 1 (zoom 80%) ... と適当に動かす
3. 最終的に Settings 画面を開く
4. **期待**: 「現在の拡大率: 73%」など 5 単位でない値が表示される (drift しない)

→ 5 シナリオすべて user 体感で問題なければ「治った」判定。1 つでも違和感あれば PR をその場で revert。

## 4.4 rollback 手順

### Phase 1 PR 後、本番で問題発覚した場合

#### 軽微な問題 (HMR で fix forward 可能)

- 新 PR で fix を当てる
- 例: 「Reset 後の scroll 計算が viewport size 大画面で 1px ずれる」 → C-fix の追加 PR

#### 深刻な問題 (Phase 1 全体を戻す)

```bash
git checkout main
git revert <PR-merge-commit-sha>
git push origin main
```

これだけで Phase 1 を完全に main から消せる。**revert で復活する旧 zoom 実装** (PR #279 base + 二重 clamp + viewport center anchor 不在) は user fb の元の状態だが、新規退行を起こさないので一時退避先として安全。

#### 緊急 hotfix (本番 user に影響中)

- 段階 1: rollback PR 即作成 + auto-merge
- 段階 2: dispatch-log.md に「rollback 経緯」 entry 追加
- 段階 3: Phase 1.1 として **退行原因のみ修正** した小規模 PR を作成し直す

### rollback 後に Phase 1 を再着手する場合

1. main の状態を確認 (Phase 1 が綺麗に消えていること)
2. 本 phase1-plan-*.md は archive せず active のまま (再着手用)
3. 失敗の learnings を `docs/lessons.md` に追加
4. 修正版 Phase 1 として **新 branch** `fix/zoom-rewrite-phase1-v2` で再着手

## 4.5 PR 後の docs 整理

PR merge 後 1 週間 user 検収で問題なければ:

1. `phase1-investigation*.md` を archive へ移動 (`docs/l3_phases/archive/PH-zoom-rewrite-phase1/`)
2. `phase1-plan*.md` も archive
3. ux_standards.md §13 の更新を確定 (この時点で active spec)
4. memory には保存しない (技術詳細は git log + archive で参照可能)

## 4.6 Phase 2 への引き継ぎ

Phase 1 完了後、Phase 2 着手前に確認すべきこと:

- zoom-math.ts の関数群が CSS transform stage に流用可能 (現状 scrollLeft/Top ベース → translate 化必要)
- `cellStrideX/Y` は cell 間隔として両方で使える
- `computeBoundingBox` / `computeOrigin` は座標系不変
- `computeZoomAnchorScroll` の return を scrollLeft/Top → CSS translate に変換するアダプタが Phase 2 で必要

→ Phase 2 の調査 doc は Phase 1 完了後に作成する (`phase2-investigation.md`)。
