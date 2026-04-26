---
id: PH-20260426-304
status: done
batch: 69
type: 整理
---

# PH-304: ExeFolderWatchWidget 整理（launcher 共通化 + Settings 配線 + 候補メモ整備）

## 横展開チェック実施済か

- launch ロジックが既に LibraryCard / RecentLaunches / Favorites / Palette で `cmd_launch_item` を呼んでいる → 直接 path 起動するか item 化を経由するか決定する
- WidgetSettingsDialog の widget_type 分岐パターン整合（quick_note / projects / exe_folder）
- 「次バッチ候補」を dispatch-log で運用化

## 参照した規約

- `arcagate-engineering-principles.md` §7 リファクタ発動条件
- `feedback_no_idle_dispatch.md` 次バッチ候補の積み運用

## 仕様

### A. 起動ロジック共通化判断

ExeFolderWatchWidget の entry クリックは:

- Option A: `cmd_launch_item` を **使わず** path 直接起動（軽い、ただし起動ログ・カウンタ未記録）
- Option B: 仮想 Item を作って `cmd_launch_item` 経由（記録あり、scope 大）

→ **Option A 採用、ただしコメントで「起動カウンタは Library 経由のみ」と明記**。
将来 Library と統合したくなったら別 Plan で `cmd_launch_path` を新設して両者を集約。

### B. WidgetSettingsDialog 共通基盤

PH-301 で widget_type='exe_folder' 分岐を追加。本 Plan で各ウィジェットの設定キーを `WidgetConfig` 型に集約整理（型安全性向上）。

### C. dispatch-log に「次バッチ候補（新ウィジェット）」セクション新設

```markdown
## 新ウィジェット候補（運用メモ）

各バッチで改善系 1〜3 本を新ウィジェット枠に充てる運用:

- batch-69: ExeFolderWatchWidget（実装中）
- batch-70 候補:
  - ClipboardHistoryWidget（クリップボード履歴）
  - SnippetWidget（スニペット集 / 定型文 quick paste）
  - DailyTaskWidget（今日のタスク mini）
  - FileSearchWidget（everything 風 instant 検索）
- batch-71 候補:
  - SystemMonitorWidget（CPU / RAM / network mini）
  - RecentCommandsWidget（直近実行コマンド再実行）
  - WeatherWidget（天気 / 時刻補助）
```

ユーザフィードバック反映運用（batch-67 / 68 で確立した構造）を継承。

### D. ux_standards 追記

`§13. ウィジェット種別の追加方針`（仮）:

- 新ウィジェットは **WidgetShell + 即モーダル** 必須（DropdownMenu 禁止）
- 設定キーは `WidgetSettingsDialog` の widget_type 分岐に追加
- widget_type enum に追加（Rust + TS 同期）
- 「ウィジェット追加」UI に登録

## 受け入れ条件

- [ ] 起動ロジック判断を dispatch-log に記録 [History]
- [ ] WidgetSettingsDialog の exe_folder 分岐実装済（PH-301 で確認）[P consistency]
- [ ] dispatch-log「新ウィジェット候補」セクション追加 [Operations]
- [ ] ux_standards.md §13 追記 [Structure]
- [ ] `pnpm verify` 全通過
