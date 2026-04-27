# batch-109 Phase B Per-widget polish — 共通品質 checklist

各 PH-499..506 plan で**全項目 PASS** が完走条件。各 widget plan は本 checklist を参照して
個別差分のみ記述。

## 共通 checklist (各 widget で適用)

- [ ] 主要操作 / sub 操作 / 状態が明確に再定義 (REQ レベルで列挙)
- [ ] **S/M/L サイズで適切に responsive** (隠す要素 / 縮小要素 / 主役要素を size 別に明記)
- [ ] 横/縦スクロールバー出ない (overflow: visible でも内容が container 内に収まる)
- [ ] アイコン+文字列はみ出しなし (truncate + tooltip + min-w-0 + shrink-0)
- [ ] hover / focus / pressed / disabled / selected / loading / error 全状態の表現
- [ ] keyboard ナビ (Tab / Enter / Esc / 矢印)
- [ ] dark mode / 既存 builtin theme (Light/Dark/Endfield/LiquidGlass/UbuntuFrosted) 適合
- [ ] E2E 1 シナリオ以上
- [ ] store mutation の正しい reactive 反映 (画面切替なしで反映、PH-479 整合)
- [ ] before/after スクショ取得 (PR 説明に貼る)

## 適用 widget 一覧

| Plan   | Widget                 | 個別注意                                              |
| ------ | ---------------------- | ----------------------------------------------------- |
| PH-499 | ClockWidget            | PH-498 hotfix の responsive を polish 化              |
| PH-500 | SystemMonitorWidget    | CPU/MEM/Disk gauge の responsive、数値 truncate       |
| PH-501 | ExeFolderWatchWidget   | PH-490/492 fix を本格 polish (file row layout)        |
| PH-502 | (WatchFolder 互換)     | ExeFolder と統合 or 別                                |
| PH-503 | FileSearchWidget       | PH-493 fix を本格 polish (sticky bar + keyboard nav)  |
| PH-504 | ItemWidget             | PH-497 picker fix 後の本体 polish (single/multi mode) |
| PH-505 | ClipboardHistoryWidget | history list responsive、長文 truncate                |
| PH-506 | DailyTaskWidget        | PH-488 完了/未完了ツリーを本実装 + polish             |

## 完走条件

- 全 plan で checklist 全項目 PASS
- 各 plan で `pnpm verify` 全通過、E2E pass、dev 目視
- batch-109 完走前: feedback_widget_editing_ux.md + transcript 全 user fb 全文照合 → 表報告 → user OK
