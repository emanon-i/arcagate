---
id: PH-20260426-345
status: done
batch: 78
type: 改善
---

# PH-345: ウィジェット role="group" + tabindex で Tab フォーカス可能化（batch-76 PH-336 持越）

## 横展開チェック実施済か

- batch-75 で WIDGET_LABELS をローカライズ aria-label に渡せるようになった、残り tabindex
- 編集モード時のみ Tab フォーカス可能にする（通常閲覧時は不要）

## 仕様

- WorkspaceWidgetGrid `role="group"` div に `tabindex={editMode ? '0' : '-1'}` 動的付与
- フォーカス時の outline は selectedWidgetId と同じ box-shadow（既存 selection ring 流用）
- Tab で次のウィジェットへ、Shift+Tab で前へ

## 受け入れ条件

- [ ] 編集モードで Tab 移動可能
- [ ] 通常モードでは Tab フォーカスを取らない
- [ ] focus visible で selection ring が出る
- [ ] `pnpm verify` 全通過
