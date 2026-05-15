# Button 使用 rubric

> **目的**: button 配置時に **「いつどれを使うか」 を即決判断** できる decision tree + variant rule。
> **対象**: 全 frontend developer / agent / refactor 担当。
> **永続性**: design system の中核、 更新頻度低、 button 拡張時に本 doc を update。
> **status**: 2026-05-14 制定 (audit completion から)。
> **背景**: `E:/tmp/arcagate-refactor-audit-2026-05-13.md` Q4 (raw button 60 file の design system 不一貫) を解決する design rule。

---

## 1. 6 分類 + decision tree

### 判定 question (= click したら何が起きる?)

```
button 配置する → click したら何が起きる?
│
├─ 「データを永続変更 / 操作完了」
│   ├─ 「リセット / 削除 / 不可逆」 → (c) destructive
│   └─ それ以外 (保存 / 確定 / 進む) → (a) primary
│
├─ 「データを永続変更しない」
│   ├─ 「取り消し / dismiss / 戻る」 → (b) secondary
│   ├─ 「表示 / 状態切替 (data 変えない)」 → (d) toolbar
│   └─ 「label text 無し icon のみ」 → (e) icon-only
│
└─ 「OS chrome / 専門 UI 部品」 → (f) keep raw (= shadcn Button 不使用)
```

---

## 2. 6 分類 × shadcn Button variant mapping

| #     | 分類                       | **判定 question**                                                           | **使用 component / variant**                          | 例                                                                      |
| ----- | -------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------- |
| **a** | **primary**                | 「click で **操作が完了** する (保存 / 確定 / 同意 / 進む)」                | `<Button variant="default">`                          | 「保存」 「次へ」 「同意」 「アイテムを追加」 「実行」                  |
| **b** | **secondary**              | 「click で **取り消し / 後戻り** (保存しない / dismiss / 戻る)」            | `<Button variant="outline">`                          | 「キャンセル」 「戻る」 「閉じる (結果なし)」 「あとで」                |
| **c** | **destructive**            | 「click で **削除 / リセット** (不可逆 or 高リスク)」                       | `<Button variant="destructive">`                      | 「削除」 「全部消す」 「リセット」 「強制終了」                         |
| **d** | **toolbar**                | 「click で **表示 / 状態切替** (data は変えない)」                          | `<Button variant="ghost" size="sm">`                  | 「sort 順切替」 「filter 切替」 「grid/list 切替」 「展開/折り畳み」    |
| **e** | **icon-only**              | 「label text **なし**、 icon の universal recognition のみ」                | `<Button variant="ghost" size="icon">` (or `icon-sm`) | 「×」 (close) / 「歯車」 (settings) / 「…」 (more) / 「↩」 (undo)       |
| **f** | **chrome / dense control** | 「OS / 環境固有 (window control / drag region / resize handle / 専門部品)」 | **raw `<button>` keep** (shadcn Button 不使用)        | TitleBar minimize / WidgetHandles 8 方向 resize / カラーピッカー swatch |

---

## 3. 各 variant の rule (色 / hover / icon / size / disabled state)

### (a) primary — `variant="default"`

- **色**: `bg-primary` / `text-primary-foreground` (= shadcn token bridge で `var(--ag-accent)` / `var(--ag-accent-text)` 追従)
- **hover**: `hover:bg-primary/90` (= 10% 透過で feedback)
- **icon**: label の左側に配置 OK、 size は `h-4 w-4` (shadcn `[&_svg:not([class*='size-'])]:size-4` で auto)
- **size**: default `size="default"` (= h-9)、 form footer は `size="sm"` も OK
- **disabled**: `disabled:opacity-50` (shadcn 既定)

### (b) secondary — `variant="outline"`

- **色**: `border` / `bg-background` / `hover:bg-accent hover:text-accent-foreground`
- **hover**: 上記 hover で reverse effect
- **icon**: label 左 OK
- **size**: default、 cancel button は `size="sm"` で primary より小さく見せる慣習 OK
- **disabled**: 同上

### (c) destructive — `variant="destructive"`

- **色**: `bg-destructive` / `text-white` / `hover:bg-destructive/90`
- **hover**: 暗くなる
- **icon**: trash / X 等の icon を label 左に
- **size**: default
- **disabled**: 同上
- **rule 追加**: **destructive button click 後は ConfirmDialog 必須** (= 不可逆操作の confirmation、 user safety)

### (d) toolbar — `variant="ghost" size="sm"`

- **色**: `bg-transparent` / `text-muted-foreground` / `hover:bg-accent`
- **hover**: 背景のみ強調
- **icon**: icon-only or icon+label 両対応
- **size**: `sm` (= h-8) or `default`
- **active state**: 選択中 toolbar button は `bg-accent text-accent-foreground` で明示
- **disabled**: 同上

### (e) icon-only — `variant="ghost" size="icon"` (or `icon-sm` / `icon-lg`)

- **色**: `bg-transparent` / `text-muted-foreground` / `hover:bg-accent`
- **hover**: 背景強調
- **size**: `icon` (= size-9 = 36px square)、 dense は `icon-sm` (= size-8)、 prominent は `icon-lg`
- **rule 必須**: **`aria-label` 必須** (= label text 無しの a11y 要件、 lefthook `audit-aria-icon-only-buttons` で機械検出)
- **disabled**: 同上

### (f) chrome / dense control — **raw `<button>` keep**

- **使用箇所** (= shadcn Button 不使用、 意図的 custom):
  1. **OS chrome**: `TitleBar.svelte` window control (minimize / maximize / close)
  2. **専門 UI 部品**:
     - `WidgetHandles.svelte` 8 方向 resize handle
     - `ItemFormCardOverride.svelte` color picker swatch
  3. **Entire-row click target (list item card-style)**:
     - `LibraryCard.svelte` library card 本体
     - `StatsWidget.svelte` / `FileSearchWidget.svelte` result row / `ItemWidget.svelte` icon grid item / `RecentLaunchesWidget.svelte` / `FavoritesWidget.svelte` / `ProjectsWidget.svelte` / `ExeFolderWatchWidget.svelte` row / `ClipboardHistoryWidget.svelte` row / `SnippetWidget.svelte` row / `DailyTaskWidget.svelte` row / `WidgetItemList.svelte` row (= 全 widget body の clickable item card pattern)
     - **理由**: entire row が click target、 `rounded-2xl` / 大 padding / dynamic state styling (= selected ring 等) で shadcn `Button` base radius / size と乖離、 visual を変えると information density が崩れる
  4. **Tab pattern (= shadcn Tabs primitives 領域)**:
     - `SettingsPanel.svelte` category tabs (`role="tab"` + `aria-selected`、 将来 bits-ui Tabs 化想定)
     - `PageTabBar.svelte` workspace page tabs (同上)
  5. **Snackbar / search bar の dense close/clear X**:
     - `LibraryUndoSnackbar.svelte` / `WorkspaceUndoSnackbar.svelte` close X (`rounded-full p-0.5`、 snackbar 内 compact icon、 shadcn `size="icon"` (36px) より小さい dense control)
     - `PaletteSearchBar.svelte` clear X (search bar 内 compact icon)
  6. **Widget header dense icon button**:
     - `WidgetShell.svelte` header menu button (`rounded-lg border p-1`、 widget header に密接、 shadcn `size="icon-sm"` (32px) より dense)
  7. **Layout-specific vertical strip**:
     - `WorkspaceLayout.svelte` sidebar 非表示時の縦長 toggle strip (`w-7 h-full`、 28px 幅 × 高さ全体 layout)
  8. **Form label adjunct inline icon** (`p-0.5` 等の極小 padding):
     - `LibraryDetailMetadata.svelte` info icon (`p-0.5` inline label adjunct)
  9. **Card-style action button cluster (= entire button が card 形状)**:
     - `LibraryDetailActions.svelte` favorite / delete / 起動 / 編集 button (`rounded-2xl px-3 py-3` large card layout、 shadcn base radius `rounded-md` (6px) と乖離)

- **理由 (一般化)**:
  - OS 慣習尊重 (window control 等)
  - 専門 UI の visual unique 維持 (color picker / resize handle)
  - **entire row / card click target は density が情報設計の一部** = shadcn `Button` の default radius / padding と衝突
  - **dense compact icon** (`p-0.5` / `p-1`) は shadcn `size="icon"` (36px) / `icon-sm` (32px) より小さくないと layout が崩れる
  - **Tab pattern は別 component 領域** (= bits-ui Tabs primitives で future migration)

- **rule**: 各 chrome 部品は **個別 design token** で custom、 共通化対象外
- **判定 question** (= raw keep か Button migrate かの最終判定):
  1. shadcn `size="icon"` / `icon-sm` で visual が崩れるか? (= padding / radius が標準 token と乖離) → **keep raw**
  2. entire row / card 形状で click target か? → **keep raw**
  3. tab pattern (role="tab") か? → **keep raw** (将来 Tabs primitives へ)
  4. それ以外 → **shadcn Button migrate**

---

## 4. variant 拡張時の rule

新 variant を `Button.svelte` に追加する条件:

1. **3+ 件 duplicate** (= Rule of Three) で出現
2. **既存 6 variant ではどうしても表現できない**
3. **prop 数 5+ になる god prop 化を避ける** (5+ で別 component 検討、 例: `LargeDialog.svelte` 等)

**禁止**: 1-2 件の outlier で variant 追加 (= variant prop 爆発)

---

## 5. 既存 60 file の分類 status

audit (2026-05-14) で grep 結果 60 file の raw `<button>` を本 rubric 6 分類で **mass migration** 予定:

| 分類               | 想定 file 数 | migration target                                                       |
| ------------------ | ------------ | ---------------------------------------------------------------------- |
| (a) primary        | ~10          | form footer の submit / 確定 button                                    |
| (b) secondary      | ~15          | cancel / 戻る / dismiss                                                |
| (c) destructive    | ~5           | delete / remove / trash                                                |
| (d) toolbar        | ~5           | sort / filter / 表示切替                                               |
| (e) icon-only      | ~20          | × close / 歯車 settings / 「...」 more                                 |
| (f) chrome / dense | ~5           | **keep raw** (TitleBar / WidgetHandles / LibraryCard / ColorPicker 等) |
| **計**             | **60**       |                                                                        |

→ 後続 migration PR で 5 phase serial に実施 (= (e) icon-only から、 各 phase 10 file 単位)。

---

## 6. 例外 / open question

- **`Switch.svelte`** (`src/lib/components/common/`): button だが boolean state toggle 専用 component、 shadcn Button と別扱い (= 用途が完全に異なる)
- **`Chip.svelte`** (`src/lib/components/arcagate/common/`): clickable badge、 raw `<button>` で意図的 (= chip layout が button と異なる)
- **将来 toggle group / radio group / segmented button**: 追加要求あれば bits-ui の ToggleGroup primitives を別 component 化検討

---

## 7. 参照

- `src/lib/components/ui/button/button.svelte` — shadcn Button 実装 (variant + size 定義)
- `src/app.css` — shadcn token bridge (= `--primary` / `--accent` etc. を `var(--ag-*)` に追従)
- `scripts/audit-aria-icon-only-buttons.sh` — icon-only button の `aria-label` 必須 lefthook hook
- `E:/tmp/arcagate-refactor-audit-2026-05-13.md` Q4 — 本 rubric の制定 background

---

**変更履歴**:

- 2026-05-14: 初版制定 (audit completion 着手と同時)、 shadcn Button 既存 6 variant で 5 分類カバー、 IconButton.svelte 新設不要判定
- 2026-05-15: §6 (f) chrome / dense control の例外を **9 カテゴリで明示拡張** (entire-row click / tab pattern / snackbar X / widget header dense / layout strip / form label adjunct / card-style action cluster)。 Phase 1-3 button migration (PR #485 / #486 / #487) で確認した実例を全反映、 future migration の機械判定基準を確立。
- 2026-05-15: button migration **完走宣言**。 全 phase (PR #485 / #486 / #487 / #489 / #490 / #491) で migrate target を全 process、 残 raw button は全て §6 keep raw 例外で覆われる。 Phase 6-C で確認した追加 keep raw 例外:
  - **Wrapper component の内部 raw button** (= TitleAction / SidebarRow): wrapper 自身が button、 props で variant 分け、 内部実装は raw keep が妥当
  - **Tag chip + dropdown menu item pattern** (LibraryItemTagSection 4 button): chip 内 remove X / pill chip / dropdown menu item = §6 #3 + #5 同型
  - **Sort toolbar + selection segmented** (LibrarySortControls 6 button): toolbar の sort 切替 + selection mode toggle = ToggleGroup / radio group pattern
  - **Picker UI dialog rows** (LibraryItemPicker 6 button): picker dialog 内 entire row click = §6 #3 同型
  - **WorkspaceSidebar close panel** = 既 #470 で migrate 済 (= 旧縦長 strip と区別)

**最終 migration 集計** (Phase 1-6B 完走):

- migrated file: **14 file** / 約 30 button instance
- keep raw 例外: **39+ file** (全 §6 9 カテゴリ拡張で覆われる、 wrapper component 含む)
- Phase 別: Phase 1 (5 file/dialog snackbar) / Phase 2 (2 file/toolbar) / Phase 3 (1 file/library header) / Phase 5 (2 file/error link) / Phase 6-A (3 file/form footer) / Phase 6-B (1 file/theme editor)
- 効果: design system 一貫性向上、 shadcn Button token bridge 経由で theme 追従、 a11y `aria-label` 必須 hook で機械検証可
