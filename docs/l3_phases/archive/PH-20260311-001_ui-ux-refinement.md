---
status: done
phase_id: PH-20260311-001
title: UI/UX 原則適合リファインメント
depends_on:
  - PH-20260226-003
---

# PH-20260311-001: UI/UX 原則適合リファインメント

## 目的

desktop_ui_ux_agent_rules.md (P1〜P12) に基づくセルフレビューで発見された
19件の指摘を修正し、操作可能性・状態可視性・一貫性を向上させる。

## 参照ドキュメント

- UI/UX 原則: docs/desktop_ui_ux_agent_rules.md
- L1: docs/l1_requirements/vision.md §3 (REQ-010, UI改善)
- L2: docs/l2_foundation/foundation.md

## ステップ構成

| 実装順 | #   | 内容             | 件数 | 対応原則       | 状態 |
| ------ | --- | ---------------- | ---- | -------------- | ---- |
| 1      | U-1 | クリティカル修正 | 4件  | P1,P2,P3,P5    | done |
| 2      | U-2 | 操作性改善       | 8件  | P1,P2,P3,P6,P7 | done |
| 3      | U-3 | 品質・一貫性向上 | 7件  | P4,P6,P11,P12  | done |

---

## U-1: クリティカル修正（H-1〜H-4）

### U-1-1: フォーム送信の非同期対応 (H-1, P1)

**変更対象**:

- `src/routes/+page.svelte` — handleFormSubmit を async/await 化
- `src/lib/components/item/ItemFormDialog.svelte` — loading/error 状態の受け渡し
- `src/lib/components/item/ItemForm.svelte` — 送信ボタン disabled + spinner

**受け入れ条件**:

- [x] 送信中はボタンが disabled + ローディング表示
- [x] 成功時にダイアログが閉じ、トースト「アイテムを作成しました」が表示
- [x] エラー時はダイアログが開いたまま、フォーム内にエラーメッセージ表示
- [x] `pnpm verify` 通過

### U-1-2: ワークスペース名変更ダイアログ化 (H-2, P5/P2)

**変更対象**:

- `src/lib/components/arcagate/workspace/WorkspaceLayout.svelte` — prompt() を削除
- インライン入力フィールドでの名前変更に切り替え

**受け入れ条件**:

- [x] `prompt()` が使われていない
- [x] ワークスペース名変更がアプリ内ダイアログで動作する
- [x] キャンセルで元の名前が保持される

### U-1-3: ItemFormDialog のクローズ改善 (H-3, P2/P4)

**変更対象**:

- `src/lib/components/item/ItemFormDialog.svelte` — backdrop click + Escape handler

**受け入れ条件**:

- [x] バックドロップクリックでダイアログが閉じる
- [x] Escape キーでダイアログが閉じる
- [x] PaletteOverlay と同じクローズ挙動で一貫している

### U-1-4: Settings 導線の接続 (H-4, P3)

**変更対象**:

- `src/routes/+page.svelte` — Settings ボタンの onclick
- `src/lib/components/settings/SettingsPanel.svelte` — ダイアログとして表示

**受け入れ条件**:

- [x] Settings ボタンクリックで設定画面が表示される
- [x] ホットキー・自動起動・監視パスの設定が変更できる
- [x] 設定画面を閉じられる

---

## U-2: 操作性改善（M-1〜M-8）

### U-2-1: ローディング/エラーの可視化 (M-1/M-2, P1)

**変更対象**:

- `src/lib/components/arcagate/library/LibraryMainArea.svelte` — loading state 表示
- `src/lib/components/arcagate/workspace/WorkspaceLayout.svelte` — loading state 表示
- store エラー → トースト自動連携（`$effect` で error 変化を監視）

**受け入れ条件**:

- [x] Library 初回ロード時にスピナーまたはスケルトンが表示
- [x] IPC エラー発生時にトーストでユーザーに通知
- [x] `itemStore.error` / `workspaceStore.error` の変化がトーストに反映

### U-2-2: LibraryCard コンテキストメニュー (M-3, P3)

**変更対象**:

- `src/lib/components/arcagate/library/LibraryCard.svelte` — MoreHorizontal にメニュー接続

**受け入れ条件**:

- [x] カード右上の「…」クリックで起動/編集/削除メニューが表示
- [x] メニューから各操作が実行できる

### U-2-3: Palette hidden チップ動的化 (M-4, P1)

**変更対象**:

- `src/lib/components/arcagate/palette/PaletteOverlay.svelte:95`

**受け入れ条件**:

- [x] hidden チップが `hiddenStore.isHiddenVisible` の状態を反映

### U-2-4: 編集モード操作ガイド (M-5, P3/P7)

**変更対象**:

- `src/lib/components/arcagate/workspace/WorkspaceLayout.svelte` — Tip 追加

**受け入れ条件**:

- [x] 編集モード時に操作ヒント（D&D で配置、ハンドルでリサイズ等）が表示

### U-2-5: ウィジェット削除 UI (M-6, P2)

**変更対象**:

- `src/lib/components/arcagate/workspace/WorkspaceLayout.svelte` — 編集モードに削除ボタン
- `src/lib/state/workspace.svelte.ts` — removeWidget 呼び出し

**受け入れ条件**:

- [x] 編集モードで各ウィジェットに削除ボタンが表示
- [x] 削除ボタンクリックでウィジェットが削除される

### U-2-6: フォーカスリング改善 (M-7, P6)

**変更対象**:

- `src/lib/components/arcagate/library/LibraryCard.svelte`
- その他カスタム `<button>` 要素

**受け入れ条件**:

- [x] Tab キーで主要ボタンにフォーカスしたとき、リングが視認できる
- [x] 暗い背景上でもフォーカスリングが見える

### U-2-7: リサイズハンドル role 修正 (M-8, P6)

**変更対象**:

- `src/lib/components/arcagate/workspace/WorkspaceLayout.svelte:188-192`

**受け入れ条件**:

- [x] `role="separator"` が削除されている
- [x] `aria-label="リサイズ"` が残っている

---

## U-3: 品質・一貫性向上（L-1〜L-7）

### U-3-1: UI テキスト言語統一 (L-1, P4)

**変更対象**: 英語表記箇所を日本語に統一

- `LibraryMainArea.svelte:75` — "Add item" → "アイテムを追加"
- `PaletteOverlay.svelte:95` — "hidden off" → 動的テキスト（U-2-3 で対応）
- その他日英混在箇所

**受け入れ条件**:

- [x] ユーザー向けラベルが日本語で統一されている

### U-3-2: トーストアニメーション (L-2, P1)

**変更対象**:

- `src/lib/components/arcagate/common/ToastContainer.svelte`

**受け入れ条件**:

- [x] トーストにフェードイン/スライドインアニメーションがある

### U-3-3: 削除ボタン警告スタイル (L-3, P3)

**変更対象**:

- `src/lib/components/arcagate/library/LibraryDetailPanel.svelte:138`

**受け入れ条件**:

- [x] 削除ボタンが起動/編集と視覚的に区別できる（赤系トーン）

### U-3-4: Palette listbox ロール追加 (L-5, P6)

**変更対象**:

- `src/lib/components/arcagate/palette/PaletteOverlay.svelte:118`

**受け入れ条件**:

- [x] 結果リストコンテナに `role="listbox"` が付いている

### U-3-5: Tip 永続閉じ確認 (L-6, P11)

**確認のみ**: Tip コンポーネントの `tipId` による永続的閉じが機能しているか確認。
機能していれば対応不要。

確認済み: localStorage による永続閉じが機能。対応不要。

### U-3-6: a11y ignore コメント見直し (L-4, P6)

**変更対象**:

- `src/lib/components/arcagate/palette/PaletteOverlay.svelte:65`

**受け入れ条件**:

- [x] svelte-ignore が必要最小限に限定されている

### U-3-7: トークン体系メモ (L-7, P12)

**対応**: 長期検討のため本フェーズでは docs/lessons.md に記録のみ。
shadcn トークンと `--ag-*` の関係・将来の統合方針をメモする。

記録済み: lessons.md に追記完了。

---

## 対象ファイル一覧

| ファイル                                                        | 変更理由                                              |
| --------------------------------------------------------------- | ----------------------------------------------------- |
| `src/routes/+page.svelte`                                       | U-1-1(async), U-1-4(Settings)                         |
| `src/lib/components/item/ItemFormDialog.svelte`                 | U-1-1(loading), U-1-3(close)                          |
| `src/lib/components/item/ItemForm.svelte`                       | U-1-1(button state)                                   |
| `src/lib/components/arcagate/workspace/WorkspaceLayout.svelte`  | U-1-2(prompt), U-2-4(tip), U-2-5(delete), U-2-7(role) |
| `src/lib/components/arcagate/palette/PaletteOverlay.svelte`     | U-2-3(hidden), U-3-4(listbox), U-3-6(ignore)          |
| `src/lib/components/arcagate/library/LibraryMainArea.svelte`    | U-2-1(loading), U-3-1(text)                           |
| `src/lib/components/arcagate/library/LibraryCard.svelte`        | U-2-2(menu), U-2-6(focus)                             |
| `src/lib/components/arcagate/library/LibraryDetailPanel.svelte` | U-3-3(delete style)                                   |
| `src/lib/components/arcagate/common/ToastContainer.svelte`      | U-3-2(animation)                                      |
| `src/lib/components/settings/SettingsPanel.svelte`              | U-1-4(表示先)                                         |

## 検証方法

1. `pnpm verify` が全通過
2. 既存 E2E テスト（28件）が全通過
3. 手動確認:
   - Tab キーで Library → Workspace → Palette の主要フローを辿れる
   - フォーム送信中にスピナーが表示され、成功/失敗トーストが出る
   - Settings が開閉できる
   - ウィジェット削除ができる

## Exit Criteria

- [x] H-1〜H-4 の全受け入れ条件がパス
- [x] M-1〜M-8 の全受け入れ条件がパス
- [x] L-1〜L-7 の確認/対応が完了
- [x] `pnpm verify` 通過
- [x] E2E テスト通過
