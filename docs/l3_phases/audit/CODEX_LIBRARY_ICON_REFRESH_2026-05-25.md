# 独立レビュー結果（PR #573 後 / main `c078233f`）

前提: 実行検証は行わず、静的トレースで判断しています（read-only 制約）。\
`file:line` が付かない主張は低信頼として明示します。

## 1. ②は現状で本当に正しいか（データフロー追跡 + `{#key}` 必要性）

### データフロー（画像変更→保存→一覧反映）

1. 画像選択UIは `CardOverrideDialog` 内の `ItemFormCardOverride`。\
   参照: [CardOverrideDialog.svelte](/E:/Cella/Projects/arcagate/src/lib/components/arcagate/library/CardOverrideDialog.svelte):56-58, [ItemFormCardOverride.svelte](/E:/Cella/Projects/arcagate/src/lib/components/item/ItemFormCardOverride.svelte):89-113
2. `selectImage()` は `plugin-dialog open()` 後に `cmd_save_icon_file` を呼び、返却pathを `applyOptimisticUpdate` → `updateItem` の順で反映。\
   参照: [ItemFormCardOverride.svelte](/E:/Cella/Projects/arcagate/src/lib/components/item/ItemFormCardOverride.svelte):103-113
3. `itemStore.updateItem()` は backend 返却 item で `items = items.map(...)` 再代入。\
   参照: [items.svelte.ts](/E:/Cella/Projects/arcagate/src/lib/state/items.svelte.ts):62-67
4. `LibraryMainArea` は `itemStore.items` を入力に `filteredItems` を再計算し、`LibraryView` に渡す。\
   参照: [LibraryMainArea.svelte](/E:/Cella/Projects/arcagate/src/lib/components/arcagate/library/LibraryMainArea.svelte):227-246, 449-465
5. `LibraryView` は各 card を `{#key \` ${item.icon_path}|${item.card_override_json}\`}` で再マウント。\
   参照: [LibraryView.svelte](/E:/Cella/Projects/arcagate/src/lib/components/arcagate/library/LibraryView.svelte):194-208, 248-261

### 判断

- 現状は「動かすための構成」としては整合しています。
- ただし `{#key}` は **Svelteの通常prop更新に依存せず、DOM再生成で確実反映させる回避策** です。コメント自体も回避策前提を明記。\
  参照: [LibraryView.svelte](/E:/Cella/Projects/arcagate/src/lib/components/arcagate/library/LibraryView.svelte):188-193
- よって「理想的に不要なはずの再マウントを必須化している」意味で、対症療法寄りです。

## 2. なぜ素直なリアクティビティで更新されなかったか（構造原因）

- 一次原因は `LibraryCard` 側で過去使っていた `content-visibility: auto` と画像lazyの組合せにより、モーダル中の再描画タイミングが崩れ、paint staleを起こしたこと。\
  参照: [LibraryCard.svelte](/E:/Cella/Projects/arcagate/src/lib/components/arcagate/library/LibraryCard.svelte):89-98, [ItemIcon.svelte](/E:/Cella/Projects/arcagate/src/lib/components/arcagate/common/ItemIcon.svelte):13-21
- そのため過去は `freshIconMark`（描画窓強制）を積み、さらに `{#key}` 再導入に至った履歴。\
  参照: [git show a0965ece の items.svelte.ts]（`freshIconMark` 存在）/ [LibraryView.svelte](/E:/Cella/Projects/arcagate/src/lib/components/arcagate/library/LibraryView.svelte):188-194
- 現在は `content-visibility` は撤去済み。\
  参照: [LibraryCard.svelte](/E:/Cella/Projects/arcagate/src/lib/components/arcagate/library/LibraryCard.svelte):203-208
- それでも `{#key}` を固定化しており、実質「reactive prop更新の直接信頼」をやめています。\
  参照: [scripts/audit-appearance-state-mgmt.sh](/E:/Cella/Projects/arcagate/scripts/audit-appearance-state-mgmt.sh):93-104

## 3. LB-2のWebView2巻き込みクラッシュは製品バグ兆候か

### コード上の `cmd_save_icon_file` 側

- `cmd_save_icon_file` は `spawn_blocking` で同期I/Oを逃がし、join errorは `Result` 返却。panic前提の `unwrap` は経路上に無い。\
  参照: [item_commands.rs](/E:/Cella/Projects/arcagate/src-tauri/src/commands/item_commands.rs):278-288
- `save_icon_file` も入力検証→`copy`→正規化返却で、失敗は `Err`。\
  参照: [item_service.rs](/E:/Cella/Projects/arcagate/src-tauri/src/services/item_service.rs):891-919

### テストハーネス側の不安定要因

- Playwrightは `workers:1` で単一WebView2プロセス共有。1 spec落ちると同workerの他specに連鎖しやすい設計。\
  参照: [playwright.config.ts](/E:/Cella/Projects/arcagate/playwright.config.ts):20, [tauri.ts](/E:/Cella/Projects/arcagate/tests/fixtures/tauri.ts):11-24
- LB-2自身も「mock dialog→cmd_save_icon_fileでWebView2 process落ち、他spec巻き込み」と明記して `test.skip`。\
  参照: [ph-cf-600-library-bug-fixes.spec.ts](/E:/Cella/Projects/arcagate/tests/e2e/ph-cf-600-library-bug-fixes.spec.ts):96-105

### 断定

- **現時点の根拠では、製品コードの `cmd_save_icon_file` によるクラッシュ兆候は確認できません。**
- **ハーネス（共有WebView2 + CDP + spec連鎖）由来の不安定性と判断**が妥当です。
- ただし実行ログ（クラッシュダンプ）が無いため、100%断定は不能。ここは低信頼。

## 4. 見た目設定状態管理（`disabled`/`icon_backup` 含む）の妥当性

- 実装は「OFFで消す/ONで戻す」を1回の `updateItem` でまとめる設計で、遷移整合は高い。\
  参照: [LibraryDetailPanel.svelte](/E:/Cella/Projects/arcagate/src/lib/components/arcagate/library/LibraryDetailPanel.svelte):235-275
- `disabled`/`icon_backup` は `card_override_json` に保持し、復元時に `delete` で消費。\
  参照: [LibraryDetailPanel.svelte](/E:/Cella/Projects/arcagate/src/lib/components/arcagate/library/LibraryDetailPanel.svelte):241-244, 265-269
- `LibraryCard` 側も `isCardOverrideActive()` で `disabled=true` を非適用化。\
  参照: [card-override.ts](/E:/Cella/Projects/arcagate/src/lib/utils/card-override.ts):35-37, [LibraryCard.svelte](/E:/Cella/Projects/arcagate/src/lib/components/arcagate/library/LibraryCard.svelte):59-61

評価:

- ⑤⑥の要求に対しては筋が通っている。
- ただし `card_override_json` にUI状態（`disabled`, `icon_backup`）を混在させており、**純粋な表示設定JSONとしてはワークアラウンド的**。

## 5. PH-CF-600 → PR #570 → PR #573 の時系列整理

1. `#564`（PH-CF-600）
   - `content-visibility` を前提に、`freshIconMark` 等で即時反映を補強する方向。
   - 参照: [git show ac03ba8a の LibraryCard.svelte]（`content-visibility` + virtualized class + freshIconMark）
2. `#570`
   - LB-2 e2e を「実UI経路」に戻す意図だったが、当時は `freshIconMark`/test hook 依存が残存。
   - 参照: [git show a0965ece の items.svelte.ts]（`freshIconMark`, `window.__arcagateTest__`）
3. `#573`（現状）
   - `content-visibility` と `freshIconMark` を撤去。
   - `LibraryView` に `{#key item.icon_path|card_override_json}` を再導入し、構造監査でも固定。
   - 参照: [LibraryCard.svelte](/E:/Cella/Projects/arcagate/src/lib/components/arcagate/library/LibraryCard.svelte):89-99, 203-208, [LibraryView.svelte](/E:/Cella/Projects/arcagate/src/lib/components/arcagate/library/LibraryView.svelte):194,248, [audit-appearance-state-mgmt.sh](/E:/Cella/Projects/arcagate/scripts/audit-appearance-state-mgmt.sh):93-104

定着しなかった理由:

- 原因層が「store更新不足」ではなく「描画スケジューリング（CV + lazy + overlay）」だったため、上位の楽観更新やマーク加算だけでは再発余地が消えなかった。

---

## 真の root cause

- 根本は **`content-visibility: auto` を持つカード群に対し、モーダル重畳中の画像差し替えを行った際のpaint stale**。\
  参照: [LibraryCard.svelte](/E:/Cella/Projects/arcagate/src/lib/components/arcagate/library/LibraryCard.svelte):91-95

## 対症療法を剥がした target アーキテクチャ

- `LibraryCard` は通常のprops更新で反映（`{#key}` 依存を外す）。
- 仮想化が必要なら CSS `content-visibility` ではなく、行/カード単位の明示virtualizer導入で「表示中ノードは常に通常更新」契約にする。
- `card_override_json` から運用状態（`disabled`,`icon_backup`）を分離し、UI状態は別フィールド管理が望ましい。
- （上記のうち最後2点は提案であり、直接実装根拠行はありません。低信頼）

## ②を実UIで機械検証するe2e案

- LB-2を「単独プロセス/単独job」で隔離実行（共有worker連鎖を遮断）。\
  参照: [playwright.config.ts](/E:/Cella/Projects/arcagate/playwright.config.ts):20, [tauri.ts](/E:/Cella/Projects/arcagate/tests/fixtures/tauri.ts):11-24
- `mockTauriOpenDialog` を使うなら `beforeEach/afterEach` で必ず復元し、失敗時でも解除する共通fixture化。\
  参照: [dialog-mock.ts](/E:/Cella/Projects/arcagate/tests/helpers/dialog-mock.ts):26-61
- それでもWebView2 crashが残るなら、現状コメントどおり「製品回帰検出は構造監査 + manual CDP」にフォールバックするのが正直な代替。\
  参照: [ph-cf-600-library-bug-fixes.spec.ts](/E:/Cella/Projects/arcagate/tests/e2e/ph-cf-600-library-bug-fixes.spec.ts):98-103

---

補足（不整合指摘）:

- 仕様書は LB-2-real を機械検出に含むと書く一方、実テストは `skip` です。\
  参照: [library.md](/E:/Cella/Projects/arcagate/docs/l2_foundation/features/screens/library.md):223-227, [ph-cf-600-library-bug-fixes.spec.ts](/E:/Cella/Projects/arcagate/tests/e2e/ph-cf-600-library-bug-fixes.spec.ts):105
- この乖離は運用品質上のリスクです。
