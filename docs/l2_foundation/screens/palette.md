# Palette (コマンドパレット)

> UX / IA カタログ (画面構成・UI 要素・典型シナリオ)。機能契約 (やる / やらない / 性能予算) は [`../features/screens/palette.md`](../features/screens/palette.md)。

最速起動経路。 どの画面にいても **Ctrl+Shift+Space** で呼び出し、 名前を打って Enter で実行する floating window。 system tray 常駐なので desktop のどこからでも起動可能。

route: `src/routes/palette/+page.svelte` (別 webview window)

---

## 何があるか

| 要素          | 内容                                                                             |
| ------------- | -------------------------------------------------------------------------------- |
| Search bar    | 入力欄 + 検索 scope chip + clear button + close button                           |
| Result list   | fuzzy match のヒット結果 (Library item + system command 候補)                    |
| Quick context | 選択中 item の preview (icon + label + path + launch stats)                      |
| Key guide     | キーボード操作 hint (↑↓ 移動 / Tab 詳細 / Ctrl+H 非表示表示 / Ctrl+K アクション) |

実装場所:

- `src/lib/components/arcagate/palette/PaletteOverlay.svelte` (root)
- `PaletteSearchBar.svelte` / `PaletteResultRow.svelte` / `PaletteKeyGuide.svelte` / `PaletteQuickContext.svelte`
- state: `src/lib/state/palette.svelte.ts`

---

## 機能

### 起動経路

- グローバルホットキー (`Ctrl+Shift+Space`、 user 変更可) で表示
- tray icon click でも main window 経由で間接表示

### 検索

- 入力 = label / aliases の fuzzy match (`utils/fuzzy-search.ts`)
- 検索 scope chip 「Arcagate 全体を検索」 (icon-only badge)
- 空 query 時 = recency + frequency score の frecency 順 default 表示

### 操作

- ↑↓ で result row 移動
- Enter で launch、 LaunchService cascade resolve (item.default_app → widget default → global default)
- Tab で詳細 panel (Quick context) focus
- Ctrl+H で 非表示 item を含めて表示
- Ctrl+K でアクション menu (open in Explorer / Edit / Delete 等)
- Esc または palette 外 click で close

### Special prefix

- `:dev` 開発ツールのみフィルタ
- `=` 計算機 mode (例: `=1+2*3`)
- `>` 内蔵 command (例: `>theme dark` / `>reload`)

### Tray 常駐

- bg process 維持、 hotkey listener 常時稼働
- main window が non-visible でも palette 単独で起動可能

---

## こうあってほしい (L0 抜粋)

- ホットキー押下から表示まで **1 秒以内**
- 名前の一部入力で fuzzy match 候補が即出る
- キーボードだけで完結 (↑↓ + Enter)
- Esc または palette 外 click で close

---

## 典型シナリオ

```
ゲーム起動    : Ctrl+Shift+Space → ゲーム名 一部 → Enter
Blender 切替  : Ctrl+Shift+Space → blen4 → Enter
Claude Code   : Ctrl+Shift+Space → claude → Enter
workspace 直行: Ctrl+Shift+Space → dev (workspace 名) → 候補 item 出現 → ↑↓ → Enter
計算機        : Ctrl+Shift+Space → =128*1024 → 結果表示
```

---

## 関連 IPC

| command                  | 用途                         |
| ------------------------ | ---------------------------- |
| `cmd_search_items`       | fuzzy 検索 (label / aliases) |
| `cmd_launch_item`        | item 起動                    |
| `cmd_get_frecency_items` | 空 query 時の default 候補   |
| `cmd_open_path`          | raw path 起動 (登録外)       |

---

## 制約 / Non-goals

- 検索結果は **Library 登録 item のみ** (Everything 系 semantic 検索はスコープ外)
- multi-line input 非対応 (1 line input + 1 line action)
- 外部 web search 非対応
