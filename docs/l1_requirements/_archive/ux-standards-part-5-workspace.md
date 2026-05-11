# UX 標準 Part 5 — §13 Workspace Canvas 編集 UX

[ux-standards.md](./ux-standards.md) Workspace 専用規約 (PH-issue-002 / 029 / 034 / 040)。

## 13. Workspace Canvas 編集 UX 規約 (PH-issue-002 / 029 / 034 / 040 で確立)

### 編集モード撤廃 (即時保存)

**Workspace は常時編集可能**。旧「編集モード」toggle は廃止。すべての pointer-up / config 変更で即 IPC + DB 反映。
誤操作回復は **Undo / Redo** で行う (P2 失敗は前提で立て直し)。

### Layout 階層: scroll 境界の 3 階層 (PH-issue-029 / 034 / 040 で確立)

Workspace Canvas は以下の 3 階層で構成される。**新機能を追加する際は必ずどの階層に属するか明示**:

1. **背景 (固定)** — wallpaper / 親 column の最背景 absolute layer。
   - canvas (overflow-auto) の **外側**に配置。
   - pan / scroll の影響を受けない。
   - 例: `WorkspaceLayout` の `data-testid="workspace-wallpaper"` div。

2. **Toolbar (固定)** — PageTabBar (上部) / Undo toolbar (右下) / HintBar (下部)。
   - canvas の **sibling** として親 column の中で `relative z-XX shrink-0` で配置。
   - pan / scroll の影響を受けない、常時アクセス可能 (Apple HIG / Material 3 sticky toolbar 準拠)。
   - 例: `<div class="relative z-20 shrink-0 ... backdrop-blur-sm"><PageTabBar/></div>`。

3. **Content (scroll/pan)** — widget grid。
   - canvas (`overflow-auto`) 内部に **infinite-canvas wrapper (5000x5000、padding 2000px)** を置き、
     widget は wrapper 内 grid 配置。
   - pan で 4 方向 (上/下/左/右) 自由に移動。Obsidian Canvas 慣習。
   - 初期 scroll は wrapper 中央付近 (1900, 1900) に置く。

**禁止**:

- 上記 3 階層の境界を曖昧にする (例: wallpaper を canvas 内 absolute に置く → pan で動く、PR #255 で fix)。
- toolbar を canvas 内に置く (例: PageTabBar を canvas 内 → pan で消える、PR #255 で fix)。
- canvas content を実 widget 数に応じてサイズ変動 (例: widget なしで scroll 不可、PR #259 で fix)。

### Widget 同士は重ならない (PH-issue-003)

**全経路で overlap reject、auto-rearrange / (0,0) fallback 禁止**。

### Widget 同士は重ならない (PH-issue-003)

**全経路で overlap reject、auto-rearrange / (0,0) fallback 禁止**。

| 経路                       | 動作                                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------- |
| panel click 追加           | `findFreePosition` で空き探索、null なら toast「空きスペースがありません」+ 追加せず              |
| drag 追加 (sidebar → 座標) | `wouldOverlapAt(x, y)` で overlap → toast「他のウィジェットと重なるため配置できません」+ 追加せず |
| 移動 (drag bar)            | overlap → toast「他のウィジェットと重なるため移動できません」+ 元位置維持                         |
| リサイズ (handle)          | `clampResizeForOverlap` で rubber-band (重ならない最大に丸める)                                   |

実装: `src/lib/utils/widget-grid.ts` の `wouldOverlapAt` / `findFreePosition` (null 返却版) を全経路が呼ぶ。
`src/lib/state/workspace.svelte.ts` の `addWidget` / `addWidgetAt` / `moveWidget` がそれぞれ overlap check して toast 経由で fail。

### Obsidian 入力マッピング (全装備)

| 入力                            | 動作                                                         | 実装                                                                  |
| ------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------- |
| マウス wheel (上下)             | 縦 scroll (pan Y)                                            | ブラウザ標準                                                          |
| **Shift + wheel**               | 横 scroll (pan X)                                            | `useWidgetZoom` の wheel handler                                      |
| 中ボタン drag                   | 自由 pan (XY 同時)                                           | `WorkspaceLayout` の pointer handler                                  |
| Space + 左 drag                 | 自由 pan (XY 同時)                                           | `WorkspaceLayout` の keydown + pointer handler、入力欄 focus 中は無効 |
| **Ctrl + wheel**                | zoom (50〜200%、±10)                                         | `useWidgetZoom`                                                       |
| **Ctrl + 0**                    | zoom 100% リセット                                           | `WorkspaceLayout` keydown + toolbar button                            |
| **Ctrl + Shift + 1**            | Fit to content (全 widget が画面に収まる zoom 自動計算)      | `WorkspaceLayout` keydown + toolbar button                            |
| **Ctrl + Z**                    | Undo                                                         | `WorkspaceLayout` keydown + toolbar button                            |
| **Ctrl + Shift + Z / Ctrl + Y** | Redo                                                         | 同上                                                                  |
| Delete / Backspace              | 選択 widget 削除確認 (入力欄 focus 中は無効)                 | 既存                                                                  |
| Esc                             | 選択解除                                                     | 新規                                                                  |
| 通常モード scrollbar            | 表示 (`canvas-edit-mode` class は常時 active、scroll は標準) | —                                                                     |

`page.mouse` 直接呼びは禁止 (lessons.md batch-16、PointerEvent 直接 dispatch を使う)。

### Undo / Redo system (5 種 history、50 件 ring buffer)

**HistoryEntry** 種別:

| 種別     | before                | after         | undo 動作         | redo 動作      |
| -------- | --------------------- | ------------- | ----------------- | -------------- |
| `add`    | —                     | rect + config | remove            | add            |
| `remove` | rect + config         | —             | add (新 widgetId) | remove         |
| `move`   | rect                  | rect          | rect 戻す         | rect 進める    |
| `resize` | rect                  | rect          | rect 戻す         | rect 進める    |
| `config` | config (string\|null) | config        | before に戻す     | after に進める |

50 件超で古いものから drop。undo 後の新 mutation で redo stack を破棄 (linear history)。

実装: `src/lib/state/workspace-history.svelte.ts` (PH-issue-002 で新設)。

### dotted grid 背景 (常時表示)

```css
background-image:
  radial-gradient(circle, rgba(128,128,128,0.22) 1.5px, transparent 1.5px),
  linear-gradient(180deg, var(--ag-surface-0) 0%, var(--ag-surface-page) 100%);
background-size: 24px 24px, 100% 100%;
```

`canvas-edit-mode` class は常時付与、編集モード撤廃で「編集モード時のみ表示」概念は廃止。

### 右下 floating toolbar

Workspace 右下に固定:

- Undo / Redo button (history 空時 disabled)
- Reset (Ctrl+0)
- Zoom % 表示 (`{configStore.widgetZoom}%`、tabular-nums)
- Fit (Ctrl+Shift+1)

各 button: ghost-icon、hover で `bg-surface-2`、focus ring 必須、aria-label 機能名。

### ウィジェットリサイズハンドル（PH-issue-001 で完成）

選択 widget のみ表示 (非選択 widget には出ない、P11 装飾は対象を邪魔しない)。

**8 方向 完成 (n/s/e/w + 4 corner)**:

| ハンドル         | cursor      | 軸          | aria-label                   |
| ---------------- | ----------- | ----------- | ---------------------------- |
| n (上辺)         | ns-resize   | height のみ | ウィジェットの上辺を変更     |
| s (下辺)         | ns-resize   | height のみ | ウィジェットの高さを変更     |
| e (右辺)         | ew-resize   | width のみ  | ウィジェットの幅を変更       |
| w (左辺)         | ew-resize   | width のみ  | ウィジェットの左辺を変更     |
| nw (左上 corner) | nwse-resize | 両軸        | ウィジェットの左上を変更     |
| ne (右上 corner) | nesw-resize | 両軸        | ウィジェットの右上を変更     |
| sw (左下 corner) | nesw-resize | 両軸        | ウィジェットの左下を変更     |
| se (右下 corner) | nwse-resize | 両軸        | ウィジェットの幅と高さを変更 |

実装: `src/lib/components/arcagate/workspace/WidgetHandles.svelte` (PH-issue-001 で新設)。
edge は細いストリップ (1.5px、hover で半透明 accent)、corner は 12×12 chip (hover で scale-125 + accent border)。

### ウィジェット削除 / 選択 / 移動

- 編集モード ON で **selection** state を導入
- widget click → 選択 (selectedWidgetId 更新)
- canvas (空白) click → 選択解除
- 選択 widget のみ:
  - selection ring (`ring-2 ring-[var(--ag-accent)]`)
  - 上端 drag bar (Notion 風 floating chip、`-top-3 left-1/2`、cursor-grab、`GripHorizontal` icon)
  - 右上 × button (`-right-3 -top-3 floating`、shadcn ghost-icon、hover で `bg-destructive` + white text、`X` icon)
  - 8 方向 resize handles
- 削除動線:
  - **Delete / Backspace キー**: 入力欄 focus 中は無効、削除確認 dialog 経由
  - **× button click**: 同経路
  - 削除確認 dialog は batch-16 の getByRole('dialog') パターン踏襲

### ❌ 過去採用していて棄却した実装パターン (再発防止)

| パターン                                                                | 棄却理由                                   | 引用元                          |
| ----------------------------------------------------------------------- | ------------------------------------------ | ------------------------------- |
| 編集モード ON 時に **全 widget で常時可視 chip handle + delete button** | P11 装飾は対象を邪魔しない違反、認知ノイズ | `desktop_ui_ux_agent_rules` P11 |
| **`rounded-full bg-destructive/80` 派手丸**の delete button             | 「過度に派手 NG」「よく磨かれた工具」違反  | `arcagate-visual-language.md`   |
| 選択状態を **box-shadow inline style で margin 表現**、ring なし        | 選択状態が認識困難、§6-1 規格違反          | `ux_standards §6-1`             |

これらは PH-issue-001 で全廃。`scripts/audit-handle-style.sh` で再発を機械検出。

---
