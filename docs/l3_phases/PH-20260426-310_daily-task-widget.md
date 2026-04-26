---
id: PH-20260426-310
status: done
batch: 71
type: 改善
---

# PH-310: DailyTaskWidget（チェックリスト、localStorage ベース）

## 横展開チェック実施済か

- 既存 QuickNoteWidget の localStorage 永続化パターン踏襲
- 既存 WidgetShell + menuItems = 1「設定」即モーダル原則準拠
- WidgetSettingsDialog の widget_type 分岐パターン踏襲

## 仕様

- チェックボックス + テキスト の項目リスト、Enter で追加、× で削除
- 完了 / 未完了の表示分け（取り消し線 + opacity）
- 状態は widget config JSON に保存（DB 経由）
- 設定: タイトル / 完了アイテム自動非表示

## 受け入れ条件

- [ ] DailyTaskWidget がワークスペースに追加可能
- [ ] チェックボックス toggle で状態保存
- [ ] menuItems = 1（「設定」即モーダル）
- [ ] `pnpm verify` 全通過
