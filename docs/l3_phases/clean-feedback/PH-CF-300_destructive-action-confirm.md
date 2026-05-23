---
id: PH-CF-300
status: implemented
batch: clean-feedback
type: 改善
era: Distribution Hardening
parent: README.md
---

# PH-CF-300: 破壊的操作の確認パターン統一

## 元 user fb (検収項目)

- **C1**: ライブラリのカード右クリックのコンテキストメニューに「削除」 を追加
- **E3**: workspace のページ (タブ) が誤操作で消しやすすぎる → 簡単に消せないように
- **E6**: タブ削除時にアイテムも消すか選ばせる (削除確認モーダルに「アイテムも消す」 チェックボックス)

## 問題

破壊的操作の確認方式が画面ごとにバラバラ:

- Library カード: 右クリックメニューに **削除がそもそも無い** (C1)。 削除は detail panel 経由のみ
- workspace タブ: 削除は `window.confirm` (ネイティブ)。 × ボタンが widget チップに被さる極小ターゲットで誤クリックしやすい (E3)。 `window.confirm` は OK/Cancel のみでチェックボックスを足せない (E6 を阻む)
- widget 削除: 確認なしの「即削除 + undo トースト」 方式 (`WorkspaceLayout.svelte:89`)

「破壊的操作 = confirm modal か undo-toast のいずれかを必ず経由」 という統一が無い。

## 引用元 guideline doc

| Doc                                                | Section                                       | 採用判断への寄与                      |
| -------------------------------------------------- | --------------------------------------------- | ------------------------------------- |
| `docs/l2_foundation/features/screens/library.md`   | context menu                                  | カード右クリックの項目セット          |
| `docs/l2_foundation/features/screens/workspace.md` | タブ操作                                      | タブ削除の確認                        |
| `CLAUDE.md`                                        | 設計の固定枠「選択肢 1 個の menu を挟まない」 | 確認は意味のある分岐の時のみ          |
| `CLAUDE.md`                                        | `<critical-rule id="label-content">`          | 削除ラベルは「削除」、 アイコン名禁止 |
| `docs/l2_foundation/lessons.md`                    | 破壊的操作                                    | 取り返しのつかない操作の扱い          |

## Fact 確認 (root cause / 現状)

### C1: Library カード右クリックに削除が無い

`LibraryView.svelte:265-333` のカード ContextMenu 項目 = 「起動」 「お気に入り追加/解除」 「設定を開く」 + Opener セクションのみ。 削除なし。 削除 IPC は完備: `itemStore.deleteItem` (`items.svelte.ts:101`) → `cmd_delete_item`。 undo 付き削除の参考実装は `LibraryMainArea.svelte:268` `deleteWithUndo()` (undo snackbar 連携あり)。 **正規パターンは既に存在** — `WidgetItemContextMenu.svelte:190-200` が `text-destructive` + `Trash2` の削除項目を持つ。

### E3: タブが消しやすい

`PageTabBar.svelte:132-144` の × ボタンは hover で `opacity-0→100`、 極小ターゲットで widget チップに被さる。 クリックで `handleDelete` → `deleteWorkspace` (`PageTabBar.svelte:53`)。 確認は `window.confirm` (`:57`)。 一応あるが素っ気なく、 hover 誤クリックを誘発。 `WorkspaceDeleteConfirmDialog.svelte` は実装済だが **どこからも import されていないデッドコード**。

### E6: チェックボックスを足せない

`window.confirm` (`PageTabBar.svelte:57`) は OK/Cancel のみ。 「アイテムも消す」 チェックボックスを足すには専用モーダル化が前提。 backend 側の `delete_items: bool` 引数は **PH-CF-100 で追加済** であることが前提。

## スコープ

- 破壊的操作の確認を **専用 confirm modal** へ統一
- Library カード右クリックに削除を追加 (C1)
- タブ削除を専用モーダル化 + ヒットエリア拡大 (E3)
- タブ削除モーダルに「このページの item も Library から削除」 チェックボックス (E6)

## やらないこと

- workspace 削除 cascade の backend ロジック — PH-CF-100 で完了済。 本 PH は `delete_items` 引数を UI から渡すだけ
- widget 削除の「即削除 + undo」 方式の変更 — 影響範囲が小さく現状維持で妥当。 ただし §横展開 で非対称を doc 化

## 具体タスク

1. **共通 confirm modal の確認**: 既存 `ConfirmDialog` / `ThreeOptionDialog` / `WorkspaceDeleteConfirmDialog.svelte` を調査し、 チェックボックス付き destructive confirm を出せる共通コンポーネントを 1 つに決める (既存拡張 or `WorkspaceDeleteConfirmDialog` のデッドコードを正規採用)
2. **C1 — Library カード削除**: `LibraryView.svelte` の ContextMenu に `Trash2` + `t('common.delete')` の `text-destructive` ボタンを「設定を開く」 直後に追加。 クリックで `LibraryMainArea.svelte:268` `deleteWithUndo()` を呼ぶ (undo snackbar 経路に乗せる)。 `onDeleteItem` prop を `LibraryMainArea` から配線
3. **E3 — タブ削除モーダル化**: `PageTabBar.svelte:57` の `window.confirm` を共通 confirm modal (`destructive` variant) へ置換。 × ボタンのヒットエリアを拡大し、 widget チップとの重なりを解消
4. **E6 — チェックボックス**: タブ削除モーダルに「このページの item も Library から削除」 チェックボックスを追加。 default = OFF (破壊的操作はオプトイン)。 確定時 `cmd_delete_workspace(id, delete_items)` に値を渡す (PH-CF-100 の引数)
5. **モーダル文言**: 削除対象の item 数を提示 (`LibraryDetailPanel.svelte:130-162` の widget 参照数提示が参考)

## 受け入れ条件 (機械検出)

- [ ] e2e: Library カードを右クリック → 「削除」 が表示され、 クリックで item が消え undo snackbar が出る
- [ ] e2e: タブの × クリック → 専用モーダルが開く (`window.confirm` でない)。 「アイテムも消す」 チェックボックスが存在
- [ ] e2e: チェックボックス OFF でタブ削除 → item は Library に残る / ON → 他 workspace 非参照の item が消える
- [ ] audit / unit: `window.confirm` / `window.alert` の使用箇所が 0 (または許可リスト管理) — destructive 操作は専用モーダル経由を強制
- [ ] `WorkspaceDeleteConfirmDialog.svelte` がデッドコードでなく実 import されている (dead-surface 5-path verify)

## 機能契約の追記

`features/screens/library.md` / `features/screens/workspace.md` 共通条項:

> **破壊的操作の確認契約**: item / workspace / タブの削除など取り返しのつかない操作は、 **専用 confirm modal** または **undo-toast** のいずれかを必ず経由する。 `window.confirm` / `window.alert` は使わない (チェックボックス等の拡張不能・OS 依存の見た目)。 削除確認モーダルは影響範囲 (削除される item 数 / 連鎖削除の有無) を文言で明示する。

機械検出: `window.confirm|window.alert|window.prompt` を grep する audit script を CI に追加し、 0 を要求。

## 横展開

- workspace タブ削除 (確認モーダル) と widget 削除 (undo-toast) の **非対称** を doc 化。 影響範囲が大きいタブ削除はモーダル、 局所的な widget 削除は undo-toast という基準を `features/screens/workspace.md` に明記
- Settings 系の破壊的操作 (テーマ削除 / reset 等) も `window.confirm` を使っていないか grep audit

## 工数感

| Task                                 | 工数   |
| ------------------------------------ | ------ |
| 共通 confirm modal の選定・整備      | 1 日   |
| C1 カード削除メニュー                | 0.5 日 |
| E3 タブ削除モーダル化 + ヒットエリア | 1 日   |
| E6 チェックボックス + IPC 配線       | 0.5 日 |
| test (e2e + audit script)            | 1 日   |

合計: 約 4-5 日。

## 依存・着手順

- **先行**: PH-CF-100 (E6 が `cmd_delete_workspace` の `delete_items` 引数を使う)
- **後続**: なし

## 参照

- `src/lib/components/arcagate/library/LibraryView.svelte:265-333`
- `src/lib/components/arcagate/library/LibraryMainArea.svelte:268`
- `src/lib/components/arcagate/workspace/PageTabBar.svelte:53, 57, 132-144`
- `src/lib/components/arcagate/workspace/WidgetItemContextMenu.svelte:190-200` (正規 destructive パターン)
- `WorkspaceDeleteConfirmDialog.svelte` (現状デッドコード)
- `src/lib/components/arcagate/library/LibraryDetailPanel.svelte:130-162`
