---
id: PH-20260426-332
status: done
batch: 75
type: 改善
---

# PH-332: WIDGET_LABELS を単一情報源化（Sidebar / WorkspaceWidgetGrid 等）

## 横展開チェック実施済か

- batch-67 で `nav-items.ts` に統一したのと同じ思想を WIDGET_LABELS に適用
- batch-72 / 74 で「同じ機能 = 同じラベル」原則を機械化したが、widget label は二重定義のままだった
- WorkspaceSidebar / WorkspaceWidgetGrid の 2 箇所で hardcoded だったラベルを WIDGET_LABELS に集約

## 仕様

- `WIDGET_LABELS` を `Partial` から完全 `Record<WidgetType, string>` に昇格
- 全 WidgetType に日本語ラベルを定義（漏れなく機械強制）
- WorkspaceSidebar: hardcoded label 削除、WIDGET_LABELS から取得
- WorkspaceWidgetGrid: `aria-label={widget.widget_type}` を `WIDGET_LABELS[widget.widget_type]` に置換（生 enum 値が screenreader に読まれていた）

## 受け入れ条件

- [x] WIDGET_LABELS 完全網羅（14 entry）
- [x] WorkspaceSidebar が WIDGET_LABELS を import
- [x] WorkspaceWidgetGrid の aria-label 改善
- [x] `pnpm verify` 全通過
