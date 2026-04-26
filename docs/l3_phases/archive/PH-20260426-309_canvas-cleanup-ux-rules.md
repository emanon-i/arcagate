---
id: PH-20260426-309
status: done
batch: 70
type: 整理
---

# PH-309: Canvas 編集 UX 規約整備（ux_standards § + ロジック共通化）

## 横展開チェック実施済か

- batch-67 PH-294 で確立した「ux_standards に節を追加 + 機械化候補をリスト化」運用を踏襲
- 既存 D&D / リサイズロジック共通化候補を grep（LibraryMainArea / WorkspaceWidgetGrid / 他）

## 参照した規約

- `docs/l1_requirements/ux_standards.md`
- `arcagate-engineering-principles.md` §7 リファクタ発動条件

## 仕様

### A. ux_standards.md `§14. Canvas 編集 UX`（仮）

| 操作                 | 入力                                     | 挙動                                        |
| -------------------- | ---------------------------------------- | ------------------------------------------- |
| パン                 | 中ボタン drag / Space + 左 drag          | scroll 即応、慣性なし、cursor grab/grabbing |
| 編集中スクロールバー | -                                        | 非表示（scrollbar-width: none）             |
| ウィジェット選択     | 左クリック                               | 選択枠 1px accent                           |
| 移動                 | 本体 drag                                | grab → grabbing                             |
| リサイズ             | 8 ハンドル                               | n/s/e/w + 4 corner、各 cursor、grid snap    |
| 削除                 | ホバー toolbar の Trash2 / Del キー      | 確認ダイアログ                              |
| 設定                 | ホバー toolbar の Settings2 / 右クリック | 即モーダル                                  |
| キャンセル           | Esc                                      | drag/resize 中の操作を取り消し              |

### B. PointerEvent dispatch ベース（lessons.md 踏襲）

`page.mouse` 直接呼び禁止、E2E は PointerEvent dispatch。

### C. drag/resize ロジック共通化

`src/lib/utils/pointer-drag.ts` 新規（仮）:

```typescript
export function startPointerDrag(opts: {
    onMove: (dx: number, dy: number) => void;
    onEnd?: () => void;
    cancelOnEsc?: boolean;
}): (e: PointerEvent) => void;
```

WorkspaceWidgetGrid のリサイズ + Library カード drag (PH-67 D&D) で共有可能か検証 → 共有困難なら本 Plan では見送り、観察のみ記録。

### D. dispatch-log「次バッチ候補（ウィジェット拡張）」継承

PH-304 で確立した運用継続:

- batch-71 候補: 複数選択 + grouping、Undo/Redo、ウィジェット間 align/distribute
- batch-72 候補: テンプレート保存 / インポート、ワークスペースエクスポート

## 受け入れ条件

- [ ] ux_standards.md §14 追加 [Structure]
- [ ] dispatch-log に「次バッチ候補（ウィジェット拡張）」追記 [History]
- [ ] PointerEvent dispatch 共通化判断を記録 [Structure]
- [ ] `pnpm verify` 全通過
