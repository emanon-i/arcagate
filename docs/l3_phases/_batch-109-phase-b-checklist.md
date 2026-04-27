# batch-109 Phase B 共通品質 checklist (per-widget polish)

ユーザー指示 (2026-04-28):

> ウィジットがこのアプリの肝だと思うのでとことん調整および改修して下さい。

各 widget polish (PH-506-513) で **例外なく** 全項目 PASS を完走条件とする。

## SFDIPOT 観点 (engineering-principles §6)

- [ ] **Structure**: コンポーネント分割、責務分離 (presentation / state / IPC)
- [ ] **Function**: 主要操作 / sub 操作 / 状態が明確
- [ ] **Data**: 入出力型、null/empty/extreme value 対応
- [ ] **Interface**: parent / child / IPC 境界明確
- [ ] **Platform**: Windows 11 / WebView2 固有挙動配慮
- [ ] **Operations**: 正しい使い方 / 誤操作 (ESC, Ctrl+Z 等) ハンドル
- [ ] **Time**: 60fps、アニメ duration 標準準拠 (ux_standards.md)

## 状態 7 色 (全状態の表現)

- [ ] **default**
- [ ] **hover**: subtle border / shadow
- [ ] **focus**: ring-2 accent (focus-visible 限定)
- [ ] **pressed (active)**: scale-95 or background-darken
- [ ] **disabled**: opacity-40 + cursor-not-allowed
- [ ] **selected**: ring-2 primary + background-tint
- [ ] **loading**: spinner / skeleton / pulse
- [ ] **error**: error icon + tooltip + retry

## responsive (S/M/L)

- [ ] container query (`container-type: inline-size`) で size 別 layout
- [ ] **S サイズ** (~150px width): 主要情報のみ
- [ ] **M サイズ** (~300px width): 主要 + sub 情報
- [ ] **L サイズ** (300px+): 全情報 + 詳細
- [ ] 横/縦スクロールバー出ない (overflow + scrollbar-gutter:stable)

## はみ出し対策 (PH-501 audit error 化と整合)

- [ ] `min-w-0` (parent flex の direct child)
- [ ] text 要素は `truncate` or `break-words`
- [ ] icon は `shrink-0`
- [ ] max-width 設定 (icon: 16-24px、text: 100% min-w-0)

## reactive (PH-479 整合)

- [ ] settings 変更 → widget 即時反映 (画面切替不要)
- [ ] 集約データ (counts / stats) 変更 → 該当 sidebar 即時反映
- [ ] mutation + reload を helper 経由 (`with-reload.ts`)
- [ ] keyed each で `{...item}` spread copy (lessons.md パターン)

## keyboard ナビ

- [ ] Tab で widget focus 可能
- [ ] ArrowUp/Down で row 選択 (list 系 widget)
- [ ] Enter で primary action
- [ ] Esc で cancel/close
- [ ] 右クリック menu は Shift+F10 / Apps key で開ける
- [ ] IME 中は ArrowUp/Down 等を無視 (`e.isComposing` check)

## a11y

- [ ] aria-label / role 適切
- [ ] WCAG AA contrast (text/UI)
- [ ] Reduced Motion 対応

## ダーク / 既存 theme 適合

- [ ] `--ag-*` token 使用 (ハードコード禁止)
- [ ] テーマ切替で崩れない (4 builtin theme で確認)

## エラーハンドリング (engineering-principles §3)

- [ ] try/catch + toast (formatIpcError)
- [ ] error state UI (retry ボタン)
- [ ] static log (next_action 添付)

## テスト

- [ ] **E2E spec 1 シナリオ以上** (smoke or core)
- [ ] **before/after スクショ** (PR 説明に貼る)
- [ ] **vitest unit** (state / helper)
- [ ] **Rust integration** (新 IPC あれば)

## 適用 widget 一覧 (PH-506-513)

| Plan   | Widget                 | 個別注意                                               |
| ------ | ---------------------- | ------------------------------------------------------ |
| PH-506 | ClockWidget            | PH-498 hotfix の responsive を polish 化               |
| PH-507 | SystemMonitorWidget    | CPU/MEM/Disk gauge の responsive、数値 truncate        |
| PH-508 | ExeFolderWatchWidget   | PH-490/492/PH-500 fix 後の本格 polish + icon AppWindow |
| PH-509 | (WatchFolder Settings) | PH-490b fix 後 + per-item settings 統合 (PH-504)       |
| PH-510 | FileSearchWidget       | PH-493 fix 後の本格 polish + opener 統合 (PH-505)      |
| PH-511 | ItemWidget             | PH-497 picker fix 後の本体 polish (single/multi mode)  |
| PH-512 | ClipboardHistoryWidget | history list responsive、長文 truncate                 |
| PH-513 | DailyTaskWidget        | PH-488 完了/未完了ツリーを本実装 + polish              |

## 完成条件 (各 widget で個別)

- [ ] **製品レベル**: 表示崩れゼロ、scroll 出ない、はみ出しゼロ、reactive 即時、keyboard 完備、状態 7 色対応、E2E pass
- [ ] **`pnpm verify` 全通過**
- [ ] **auto-merge 予約 + green 確認**
- [ ] **dispatch-log に done 記録**

## batch 完走条件

- 全 plan (PH-499-513) で checklist 全項目 PASS
- 各 plan で `pnpm verify` 全通過、E2E pass、CDP 自己検証
- batch-109 完走宣言前: 全 user fb 照合 → 表報告 → user OK

## 補足 (PH-499-505 横断 plan)

PH-499-505 (背景壁紙 / WatchFolder polish / audit error 化 / Workspace 拡大 / Obsidian Canvas / per-item settings / opener registry) は **per-widget polish ではなく横断系 plan**。各 plan の独自 checklist に従う。本 checklist は **PH-506-513 適用**。

## 注意

- **GitWidget 簡素化は廃止** (user fb 2026-04-28 「git 機能に不満なし、現状維持」)
- 既存 WatchFolder の git status + branch 表示は **何も触らない**
