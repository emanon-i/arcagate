---
id: PH-20260426-311
status: done
batch: 71
type: 改善
---

# PH-311: SnippetWidget（定型文 quick paste）

## 横展開チェック実施済か

- DailyTaskWidget と同じく widget config JSON で保存
- WidgetShell menuItems = 1 原則準拠
- navigator.clipboard.writeText（既存 Palette / ThemeEditor で利用）

## 仕様

- スニペット項目（タイトル + 本文）リスト
- クリックで本文を clipboard にコピー（toast でフィードバック）
- 設定モーダル: 項目 add / edit / delete

## 受け入れ条件

- [ ] SnippetWidget 追加可能
- [ ] クリックで clipboard にコピー
- [ ] toast「コピーしました」
- [ ] menuItems = 1
- [ ] `pnpm verify` 全通過
