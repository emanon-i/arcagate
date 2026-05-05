# §6 Phase L1 / L2 / L3 段階的 plan

Workspace の Phase 1 / 1.1 と同じ進行モデル: 調査 → Plan → 実装 → 検収 を Phase ごとに完結。本 file は **大枠の方向性**、各 Phase の詳細 Plan は L1 / L2 / L3 着手時に別 doc で書く。

## 6.1 Phase L1: bug fix (~2 PR、6-8 h 想定)

### scope

既知 issue を root cause で解消、UX 設計は触らない。

### 内容

- **I1 fix** (~30 min): ExeFolderWatchWidget / FileSearchWidget の `cmd_open_path` を `launchItem(item.id)` に置換 (target path lookup)、launch_log 記録を保証
- **I2 fix** (~1-2 h): dev 再現 → root cause 確定 → fix。再現 script を CDP で書く必要あり
- **I3 fix** (~3-4 h): 3 件まとめて対処
  - F1: `cmd_get_items_metadata_batch(ids)` 追加 + LibraryMainArea で 1 回 batch fetch
  - F2: itemStore に metadata cache (item.id → metadata + TTL)
  - F3: `cmd_extract_item_icon` を `tokio::spawn_blocking` で非 block
- **その他 crash 棚卸し** (~1 h): dev console error / log を grep + 拾えた crash すべてに対処

### test

- vitest: zoom-math 同様、純粋関数 (frecency / search ranking) は test、IPC 系は wrapping
- e2e: I1 fix で Recent widget が反映、I3 fix で 100 item でも応答性維持
- 実機 CDP screenshot: I1 / I2 / I3 各 before / after

### PR 構成

- PR L1-A: I1 + I3 (低 risk + 影響広い)
- PR L1-B: I2 (再現 + fix、別 PR で独立)

### 退行 risk

- 中: I1 fix で FileSearchWidget 起動が fail する exe の挙動変化 (現状 silent fail → 新 fail toast)
- 低: I3 batch IPC で response shape 変更があると依存先 (LibraryCard) 修正必要

## 6.2 Phase L2: 基礎 UX (~3-5 PR、12-20 h 想定)

### scope

**「日常使う user が当たり前と感じる」基本 UX** を整備。Playnite + Notion の見える機能をベースライン化。

### 内容

- **L2-1: keyboard nav 完全実装** (~3 h)
  - 矢印 grid nav / Enter 起動 / `F2` rename inline / `F3` edit / `Ctrl+F` focus search / `Cmd+A` / `Del` / type-to-jump
  - LibraryMainArea + LibraryCard に focus management

- **L2-2: undo toast (削除取消) + Trash** (~2 h)
  - delete 時に 5 sec "Undo" toast (workspace と同じ workspaceHistory pattern)
  - (任意) Trash collection (sys-trash tag、30 日後 GC)

- **L2-3: filter / sort UI 強化** (~3 h)
  - sort dropdown (name / 追加日 / 最終起動 / launch count / size)
  - multi-tag filter (chip + AND/OR toggle)
  - 「filter preset」保存 (localStorage)
  - filter 状態の永続化

- **L2-4: search 強化** (~3 h)
  - fuzzy match (subsequence + 大小区別なし)
  - 日本語 kana-katakana-romaji 正規化 (kuroshiro / kana 等の lib)
  - alias / target / tag 横断 search (現状 label のみ)
  - `compositionend` で debounce、IME 対応強化

- **L2-5: empty state / onboarding** (~2 h)
  - 全 0 item: 「フォルダを scan / URL paste / drag-drop」CTA
  - filter 0 件: 「filter を解除」 button
  - 例 item template

- **L2-6: 3-view toggle** (Grid / List / Category)、persist (~2 h)

### test

- e2e: keyboard 完全動作 / undo / filter persist / fuzzy search
- 実機: 大量 item で UX 確認

### PR 構成

- PR L2-A: keyboard nav (L2-1 + L2-2)
- PR L2-B: filter/sort/search (L2-3 + L2-4)
- PR L2-C: empty state + view toggle (L2-5 + L2-6)

### 退行 risk

- 中: keyboard nav 追加で既存 mouse 操作と衝突する hot path の対立 (例: card click vs Enter で矛盾)
- 中: search lib 追加で bundle size 増加 (kuroshiro は 1.5 MB)
- 低: filter persist localStorage の schema 拡張

## 6.3 Phase L3: 機能追加 (~3-5 PR、16-30 h 想定)

### scope

**性能 / 高度機能** で long-term 持続性を確保。industry comparison での「最有力 reference」(Playnite / Notion) 同等を目指す。

### 内容

- **L3-1: virtualization** (~6 h)
  - 大量 item (200+) で frame drop / GC pressure 解消
  - svelte-virtual / @tanstack/virtual or 自作 windowing
  - scroll position 維持

- **L3-2: 高度 bulk ops** (~4 h)
  - rubber-band selection (drag で範囲選択)
  - floating bulk bar (Notion ライク、上部 sticky)
  - bulk move (collection 移動) / bulk export

- **L3-3: icon system 強化** (~5 h)
  - icon variants (thumbnail / cover / hero) — Playnite の 3 slot に近づける (Phase 2 に切ってもいい)
  - extraction failure fallback UI ("再 extract" button)
  - cache invalidation (target file の mtime 比較)
  - drop-shadow GPU compositing 最適化

- **L3-4: dynamic collection** (~5 h)
  - rule-based 自動更新コレクション
  - sidebar に dynamic collection section
  - rule editor UI (tag + filter + 起動回数 + 期間 等)

- **L3-5: grouping** (~3 h)
  - group by tag / type / 起動頻度
  - sticky section header / collapse
  - per-tag persist

- **L3-6: frecency / smart ranking** (~3 h)
  - search 結果を usage × recency でソート
  - launch_log + item_stats を活用

### test

- 性能 benchmark: 500 item / 1000 item で frame rate 計測
- e2e: virtualization 含む scroll 動作 / dynamic collection 更新

### PR 構成

- PR L3-A: virtualization (大改修、独立 PR)
- PR L3-B: bulk ops + grouping
- PR L3-C: dynamic collection + frecency
- PR L3-D: icon system 強化

### 退行 risk

- 高: virtualization で scroll / focus / a11y / drag-drop の挙動変化 (testing matrix が広い)
- 中: dynamic collection で SQL query パフォーマンス (大量 item で重いリスク)
- 低: frecency 計算の正確性 (launch_log の timestamp 精度)

## 6.4 進行モード

Workspace と同じ:

- **§11 user-redo depth-first** (`docs/dispatch-operation.md`)
- 1 issue / 1 機能 ごとに「fact 確認 → guideline 引用 → 横展開 audit → 実装 + screenshot 検証 → 1 PR」を完遂
- 並行 PR 禁止、Phase L1 → L2 → L3 順次

## 6.5 全体スコジュール (見積)

| Phase    | 期間       | PR 数 | 工数    |
| -------- | ---------- | ----- | ------- |
| Phase L1 | 1 sprint   | 2     | 6-8 h   |
| Phase L2 | 2-3 sprint | 3     | 12-20 h |
| Phase L3 | 3-5 sprint | 4     | 16-30 h |
| **合計** | 6-9 sprint | 9     | 34-58 h |

(Workspace overhaul の Phase 1+1.1 が ~10 h で完了したスケール感を参考)
