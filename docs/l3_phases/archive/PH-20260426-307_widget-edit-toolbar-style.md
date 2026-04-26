---
id: PH-20260426-307
status: done
batch: 70
type: 改善
---

# PH-307: ウィジェット編集モードの削除/設定/移動 UI 統一スタイル

## 横展開チェック実施済か

- batch-67 PH-291 / PH-294 のラベル原則「アイコン名禁止 / 機能ベース」を厳守
- 既存削除確認ダイアログ（lessons.md batch-16 削除フロー）と整合
- LibraryDetailPanel の MoreMenu / ActionButton と統一感
- 「同じ機能には同じ icon + 同じラベル」（CLAUDE.md）：削除 = Trash2 / 設定 = Settings2 / 移動 = grab

## 参照した規約

- `docs/desktop_ui_ux_agent_rules.md` P3 主要操作可視化 / P4 補足ラベル原則
- 競合: Notion ホバーハンドル / Miro toolbar / Obsidian context menu

## 背景・目的

8 ハンドル（PH-306）で resize は OK。残る操作:

- **移動**: 本体 drag（特別ハンドル不要、grab cursor）
- **削除**: ホバー時 ✕ アイコン or Del キー
- **設定**: ホバー時 ⚙ or 右クリックメニュー
- **コピー / 複製**: 後続バッチ

これらを統一スタイルで配置。

## 仕様

### A. ホバー toolbar

選択 widget のホバー時、右上に小型 toolbar（薄い背景、border、shadow-sm）:

```svelte
<div class="absolute right-1 top-1 hidden gap-1 rounded-md border bg-surface p-0.5 shadow-sm group-hover:flex">
    <button aria-label="設定を開く" onclick={openSettings}>
        <Settings2 class="size-3.5" />
    </button>
    <button aria-label="ウィジェットを削除" onclick={confirmDelete}>
        <Trash2 class="size-3.5" />
    </button>
</div>
```

aria-label は機能ベース（「Settings ボタン」「ゴミ箱」禁止）。

### B. 本体 grab cursor

選択 widget の本体に `cursor-grab`、drag 中は `cursor-grabbing`。
ハンドル領域では各方向 cursor が優先。

### C. Del キー

選択中 widget で Del → 削除確認ダイアログ。lessons.md batch-16 の getByRole('dialog') パターン踏襲。

### D. 右クリックメニュー（オプション）

`oncontextmenu` で context menu（設定 / 複製 / 削除）。
`menuItems = 2 個以上` なので CLAUDE.md「選択肢 1 個メニュー禁止」原則違反しない。

### E. 編集モード OFF 時

ハンドル / toolbar / cursor すべて非表示。クリックで widget 内のコンテンツが操作される（既存通り）。

## 受け入れ条件

- [ ] ホバー toolbar が選択 widget のみ表示 [Function]
- [ ] 設定 / 削除ボタンの aria-label は機能ベース [P consistency]
- [ ] 本体 cursor が grab / grabbing [U]
- [ ] Del キーで削除確認ダイアログ [Operations]
- [ ] 編集モード OFF で UI 非表示 [Function]
- [ ] `pnpm verify` 全通過
