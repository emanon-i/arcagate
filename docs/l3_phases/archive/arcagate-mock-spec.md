# Arcagate モック画面 → Svelte 実装仕様書

> **目的**: `docs/l0_ideas/` のモック画像3枚 + React JSX ソースから UI 構造を分解し、Svelte 実装に必要な情報を網羅する。
> コードは含まない。コンポーネント境界・状態設計・既存実装とのギャップを文書化する。

---

## 1. 結論の要約

### 3画面の役割と関係

| 画面          | 役割                                                                           | ウィンドウ種別                                                                  |
| ------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| **Palette**   | デスクトップオーバーレイ起動面。ホットキー → 名前入力 → Enter の最短フロー     | **[要決定]** 現行はメインウィンドウ内 `fixed` div。独立ウィンドウ化は U-01 参照 |
| **Library**   | 登録済みアイテムの正本。タグ・別名・起動ログ・パス追跡・センシティブ設定を管理 | メインウィンドウ内タブ                                                          |
| **Workspace** | 日常運用のホーム。Library のアイテムを用途別ページ・ウィジェットで束ねる       | メインウィンドウ内タブ                                                          |

**関係**: Library が唯一のデータ管理面。Workspace は Library への参照を貼るだけで複製しない。Palette は Library + Workspace 双方を横断検索する。「Workspace に追加しても複製は作られません。編集は Library 側で行います。」

### 既存実装とのギャップ

| 画面      | ギャップ                                                                                                                                  |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Palette   | 現行は1カラム・`max-w-xl`・簡素なリスト（`ResultItem` 3バリアント）。モックは2カラム + Quick context + キーボードガイド。**全面刷新**     |
| Library   | **完全に新規**。現行は `ItemList`（テーブル型）+ `CategoryManager` + `TagManager` であり、モックの3カラムカードUIとは構造が根本的に異なる |
| Workspace | 現行は `grid-cols-4` + 4種ウィジェット。モックは12カラム + 7種ウィジェット + ページタブ + テーマ切替。**全面刷新**                        |

### コンポーネント数の見積もり

- **新規コンポーネント**: 約33種（共通12 + Palette系5 + Library系7 + Workspace系9）
- **再利用可能な既存資産**: store 4つ（`configStore`, `itemStore`, `paletteStore`, `workspaceStore`）、IPC層5ファイル、`DropZone`、`HotkeyInput`、`ExportImport`、`WatchedPathsManager`、`HiddenPasswordForm`（約10点）

---

## 2. 参照した資料と注釈ルール

### 情報ソースの注釈ルール

本仕様書に記載された内容は、出典に関係なく **すべて正式な実装仕様** として扱う。

以下の注釈は例外的に付与する:

- **[推測]**: モック画像・JSXソース・既存実装のいずれにも明示がなく、筆者が補完した内容。実装前に妥当性を確認すること
- **[要決定]**: 未確定事項（§8）への参照。実装前に方針決定が必要

モック画像・JSXソースは本仕様書の作成時に参照したが、実装者がそれらを参照する必要はない。Tailwind クラス値（例: `rounded-[22px] border px-4 py-3`）は React モックからの参考値であり、実装時は Svelte / プロジェクトの規約に合わせて調整すること。

### モック画像

| ファイル                                  | 内容                                                                                       |
| ----------------------------------------- | ------------------------------------------------------------------------------------------ |
| `docs/l0_ideas/overlay-palette-mock.png`  | コマンドパレット。2カラム（検索結果5行 + Quick context）、キーボードガイド、フィルタチップ |
| `docs/l0_ideas/window-library-mock.png`   | Library画面。3カラム（サイドバー + カードグリッド + 詳細パネル）、統計カード4列            |
| `docs/l0_ideas/window-workspace-mock.png` | Workspace画面。ページタブ + Tip + 12カラムウィジェットグリッド（7種）                      |

### JSX ソース

| ファイル                                  | 位置付け                                                                                                                                                                  |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/l0_ideas/arcagate_mockup_board.jsx` | 932行の React + Tailwind モックアップ。仕様書の作成時にスタイル値・データ構造・コンポーネント分割の参照元として使用。本仕様書に採用された内容はすべて正式な仕様として扱う |

### 既存 Svelte 実装

| パス                                        | 説明                                                                                                  |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `src/routes/+page.svelte` (187行)           | アプリ全体のシェル。タブ切替・オーバーレイ制御                                                        |
| `src/lib/components/palette/` (4ファイル)   | `CommandPalette`, `SearchInput`, `ResultList`, `ResultItem`                                           |
| `src/lib/components/item/` (5ファイル)      | `ItemList`, `ItemForm`, `ItemFormDialog`, `DropZone`, `CategoryManager`                               |
| `src/lib/components/workspace/` (8ファイル) | `WorkspaceView`, `WidgetGrid`, `WidgetCard`, `AddWidgetDialog`, 4種ウィジェット                       |
| `src/lib/components/settings/` (5ファイル)  | `SettingsPanel`, `HotkeyInput`, `AutostartToggle`, `ExportImport`, `WatchedPathsManager`              |
| `src/lib/components/setup/` (4ファイル)     | `SetupWizard`, `StepHotkey`, `StepAutostart`, `StepComplete`                                          |
| `src/lib/state/` (5ファイル)                | `config.svelte.ts`, `items.svelte.ts`, `palette.svelte.ts`, `workspace.svelte.ts`, `hidden.svelte.ts` |
| `src/app.css` (120行)                       | Tailwind v4 + shadcn-svelte トークン定義。`.dark` クラスは定義済みだがトグル機構なし                  |

---

## 3. 画面別仕様

### 3.1 Palette（オーバーレイ）

#### ウィンドウ種別

モックは「Desktop Overlay Palette」として独立したオーバーレイ表示を想定。`backdrop-blur-2xl`、`bg-[#0b0f16]/92`。

**現行はメインウィンドウ内の `fixed` div オーバーレイ**（`CommandPalette.svelte`: `fixed z-50 bg-black/50`）。Tauri 設定は単一ウィンドウ（`tauri.conf.json` に `transparent` / `decorations` / `alwaysOnTop` 等の設定なし）。モックのようなデスクトップ透過オーバーレイには Tauri マルチウィンドウ + 透過 WebView が必要。**[要決定]** → U-01 参照。

#### レイアウト

2カラムグリッド: `grid-cols-[1.35fr_0.65fr]`（左=検索結果、右=Quick context）。左カラムが結果リスト5行+キーボードガイド、右カラムが選択アイテムの詳細パネル。

#### 構成要素（上から順）

1. **ヘッダーバー**
   - 左: `Command` アイコン + 「Desktop Overlay Palette」テキスト
   - 右: `Alt + Space` チップ(accent) + `hidden off` チップ(warm)

2. **検索バー + フィルタチップ**
   - `min-w-[280px] flex-1` の入力フィールド。`border-cyan-400/20 bg-cyan-400/6`
   - 入力欄の右にチップ3つ: 「Arcagate 全体を検索」(accent)、「wk:game-dev」(default)、「hidden off」(warm)
   - 検索アイコン: `Search` (cyan-200)、テキスト: `text-base text-white/95`

   **フィルタチップの振る舞い** **[要決定]** → U-13:
   - 「Arcagate 全体を検索」: 検索スコープの表示。ワークスペース内検索時は `wk:<name>` に変わる
   - `wk:game-dev`: ワークスペーススコープフィルタ。クリックで解除（全体検索に戻る）
   - `hidden off`: 非表示アイテムの表示状態。クリックでトグル。`Ctrl+H` と同期する
   - チップの追加/削除の導線・排他ルール等の詳細は U-13 で決定

3. **結果リスト（5行）**
   - 各行: `rounded-[22px] border px-4 py-3`
   - 各行の構成:
     - 左: 円形グラデーションアイコン `h-11 w-11 rounded-2xl bg-gradient-to-br ring-1 ring-white/10` + タイトル(`text-sm font-semibold`) + サブタイトル(`text-xs text-white/50`)
     - 右: meta テキスト(`text-xs text-white/45`) + アクティブ行のみ「Enter で起動」(`text-[11px] text-cyan-200`)
   - アクティブ行: `border-cyan-400/25 bg-cyan-400/10`、非アクティブ: `border-white/8 bg-white/[0.03]`
   - グラデーション配色はアイテムごとに異なる（cyan/violet/orange/emerald/pink系）

   > **[推測]** 現行 `ResultItem.svelte` の calc / clipboard バリアント（amber / sky 配色）はモックにデザインが示されていない。通常のアイテム行と同じスタイルで統一するか、バリアント固有の配色を維持するかは実装判断。

4. **キーボードガイド（結果リスト下）**
   - `grid-cols-3 gap-2` の3列チップ: `:dev で開発ツールのみ` / `= で電卓` / `> で内蔵コマンド`
   - スタイル: `rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/45`

5. **Quick context パネル（右カラム）**
   - `rounded-[24px] border border-white/10 bg-white/[0.04] p-4`
   - 内容:
     - ヘッダー: 「Quick context」(`text-xs uppercase tracking-[0.16em] text-white/35`)
     - 選択アイテム名 + 説明文
     - 詳細行4つ: カテゴリ / 別名 / 最終起動 / 起動回数（各行 `rounded-2xl bg-white/[0.03] px-3 py-2`）
     - Tip(success): 「ショートカットや別名を登録すると、数文字で目的のアプリに到達できます。」

6. **キーボードショートカット一覧（最下部）**
   - 4つのキーヒント: `↑ ↓ 移動` / `Tab 詳細` / `Ctrl+H 非表示アイテム表示` / `Ctrl+K アクション`
   - `rounded-xl border border-white/10 bg-white/[0.03] px-2 py-1 text-xs text-white/40`

7. **Tip（Quick context 内）**
   - tone=success。Info アイコン + テキスト + X ボタン

#### 現行との差分

| 観点             | 現行 (`CommandPalette.svelte`)             | モック                                           |
| ---------------- | ------------------------------------------ | ------------------------------------------------ |
| レイアウト       | 1カラム、`max-w-xl`                        | 2カラム `[1.35fr_0.65fr]`                        |
| 結果行           | テキスト3バリアント（item/calc/clipboard） | グラデーションアイコン + title + subtitle + meta |
| Quick context    | なし                                       | 選択アイテムの詳細パネル                         |
| キーボードガイド | なし                                       | 3列チップ + 最下部ショートカット一覧             |
| フィルタチップ   | なし                                       | 検索バー横に3チップ                              |
| ヘッダー         | なし（オーバーレイに直接描画）             | ヘッダーバー + ホットキー表示                    |

---

### 3.2 Library（通常ウィンドウ内タブ）

#### レイアウト

3カラム: `grid-cols-[250px_minmax(0,1fr)_340px]`、`min-h-[760px]`。左=サイドバー、中央=カードグリッド、右=詳細パネル。

#### サイドバー（左 250px）

`border-r border-white/10 bg-white/[0.03] p-4`

1. **プロフィール風ボックス**
   - `rounded-[24px] border border-white/10 bg-white/[0.04] p-3`
   - グラデーションアバター (`h-11 w-11 rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-600`) + 「Items」+「Registry」

2. **Tip(accent)**
   - 「ここでアイテムを登録・整理します。Workspace にはよく使うものを配置できます。」

3. **カテゴリリスト（件数付き）**
   - 7行: すべて(248) / ゲーム(86) / 開発ツール(52) / スクリプト(39) / URL/Web(28) / フォルダ(21) / デフォルト非表示(22)
   - 各行: `SidebarRow` — アイコン + ラベル + meta件数。アクティブ行: `bg-cyan-400/12 text-white ring-1 ring-cyan-400/25`、非アクティブ: `text-white/65 hover:bg-white/5`

4. **D&D クイック登録ゾーン**
   - `rounded-[24px] border border-dashed border-white/15 bg-white/[0.02] p-4`
   - `+` アイコン + 「クイック登録」タイトル + 説明文「exe / url / folder / ps1 をドラッグ&ドロップで登録。アイコン取得・初期カテゴリ推定・別名候補を自動入力。」

#### メインエリア（中央）

`p-5`

1. **検索バー + ソートチップ**
   - 検索: `min-w-[340px] flex-1 rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-3`
   - ソートチップ4種: 「最近使った順」(default) / 「起動回数順」(default) / 「カテゴリ」(default) / 「タグ」(accent)
   - **合成ルール**: 検索はアクティブカテゴリ内のアイテムを対象とする（AND 条件）。ソートは検索/フィルタ結果に適用される。デフォルトソートは最近使った順

2. **統計カード4列**
   - `grid-cols-4 gap-3`。各カード `rounded-[24px] border border-white/10 bg-white/[0.03] p-4`
   - 4カード:

   | ラベル     | 値     |
   | ---------- | ------ |
   | 総アイテム | 248    |
   | 今週の起動 | 61     |
   | 追跡中パス | 94     |
   | よく使う   | Top 10 |

3. **カードグリッド（3列）**
   - `grid-cols-3 gap-4`。`LibraryCard` コンポーネント
   - 各カードの構成:
     - グラデーションヘッダー `h-28 bg-gradient-to-br ${item.art}`
     - `...` メニューボタン `absolute right-3 top-3 rounded-xl border border-white/15 bg-black/20 p-1.5`
       - メニュー項目: 起動 / Workspace に追加 / 編集 / 削除
     - 本体 `space-y-3 p-4`:
       - タイトル + ソース・タイプ
       - バッジ（`rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px]`）
       - 使用状況行（起動回数 + 最終起動）

#### 右パネル（340px）

`border-l border-white/10 bg-white/[0.03] p-5`

1. **選択アイテムヘッダー**
   - 「Selected item」ラベル + アイテム名 + バッジ（Versioned, accent tone）

2. **グラデーションプレビュー**
   - `h-40 rounded-[24px] bg-gradient-to-br` — アイテム固有のグラデーション

3. **詳細テーブル6行**
   - 各行 `rounded-2xl bg-white/[0.04] px-3 py-2.5`、キー(white/45) + 値(white/80)
   - 6行: 種別 / ソース / 別名 / 最終起動 / 起動回数 / 追跡

4. **アクションボタン 2×2**
   - `grid-cols-2 gap-2`
   - 4ボタン: 起動(Play) / Workspaceに追加(Pin) / 編集(Settings2) / 関連URL(ExternalLink)
   - 各ボタン `rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm`

5. **Tip(default)**
   - 「Workspace に追加しても複製は作られません。編集は Library 側で行います。」

6. **センシティブ制御セクション**
   - `rounded-[24px] border border-white/10 bg-white/[0.03] p-4`
   - Shield アイコン + 「センシティブ制御」ラベル
   - デフォルト非表示トグル行: ON(amber tone バッジ)
   - 説明文: 「ホットキーまたはパスワード入力で一時表示。配信・画面共有時の事故防止を優先。」

   > **非表示の仕組みはアイテム直接フラグではなくタグベース。** `Tag.is_hidden = true` のタグをアイテムに付与することで間接的に非表示化する。Item 構造体に `is_hidden` フィールドは存在しない。`SensitiveControl` のトグル UI は、内部的には hidden タグの付け外し（既存 `cmd_update_item` の `tag_ids` 操作）として実装するか、Item モデルに `is_hidden` を直接追加するか（DB マイグレーション要）の判断が必要。**[要決定]** → U-12。

#### 現行との差分

| 観点             | 現行                                                  | モック                                              |
| ---------------- | ----------------------------------------------------- | --------------------------------------------------- |
| 画面の有無       | `ItemList`（テーブル型） + `CategoryManager` が別タブ | **完全に新規構造**                                  |
| レイアウト       | 単一カラムテーブル                                    | 3カラム（サイドバー + カードグリッド + 詳細パネル） |
| アイテム表示     | `<table>` 行（label, type, target, enabled, actions） | グラデーションヘッダー付きカード                    |
| カテゴリ         | `CategoryManager`（インライン編集リスト、別タブ）     | サイドバー内カテゴリリスト（件数付き）              |
| 統計             | なし                                                  | 4列統計カード                                       |
| 詳細パネル       | なし（編集は `ItemFormDialog` モーダル）              | 右パネル常設                                        |
| 検索             | なし（Library内）                                     | 検索バー + ソートチップ                             |
| D&D 登録         | `DropZone`（`ItemForm` 内、作成モードのみ）           | サイドバー下部の常設ドロップゾーン                  |
| センシティブ制御 | `HiddenPasswordForm` (未レンダリング)                 | 右パネル内に統合                                    |

---

### 3.3 Workspace（通常ウィンドウ内タブ）

#### レイアウト

`min-h-[780px] bg-[linear-gradient(180deg,#0b0f16_0%,#0d1320_100%)] p-5`。ページタブ行 → Tip → 12カラムウィジェットグリッド。

#### ページタブ行

> **[要決定]** 現行バックエンドにページ概念は存在しない（Workspace → Widget のフラット2層）。モックのページチップ（Today / Game Dev 等）を **ワークスペース切替として実装する（案A）** か、**新規ページレイヤーを DB に追加する（案B）** か。→ U-11 参照。

上段に2つのグループ:

- **左グループ**: ページチップ群 — `Today`(accent), `Game Dev`, `Writing`, `AI Ops` + 「+ Add page」ボタン
  - 「+ Add page」: `rounded-full border border-dashed border-white/15 px-3 py-1.5 text-xs text-white/45`
- **右グループ**: テーマチップ — `Dark`(accent), `Light`, `Theme settings`

#### Tip(accent)

「このページはホームです。よく使うものをまとめて配置できます。」

#### ウィジェットグリッド

`grid gap-4 lg:grid-cols-12`。7種のウィジェット。

##### ウィジェット一覧

| # | ウィジェット              | span       | 位置     | 内容                                                                                                                                         |
| - | ------------------------- | ---------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 | **Favorites**             | col-span-3 | 左列上   | ChevronRight 付きリスト5行。badge=「Pinned 5」、source=「Linked from Library」                                                               |
| 2 | **Visibility**            | col-span-3 | 左列下   | 非表示件数(22件, amber) + 一時表示トグル(OFF, emerald) + 説明文。badge=「Privacy」                                                           |
| 3 | **Recent launches**       | col-span-6 | 中央列上 | 青ドット(`h-2.5 w-2.5 rounded-full bg-cyan-300`) + アイテム名 + 時刻。「Open in Library」ボタン。badge=「This morning」                      |
| 4 | **Projects & Git status** | col-span-6 | 中央列中 | カード型3列(`md:grid-cols-3`)。各カード: プロジェクト名 + ブランチ/ステータス + 「Open workspace」。badge=「3 repos」                        |
| 5 | **Watch folders**         | col-span-6 | 中央列下 | 2列カード(`md:grid-cols-2`)。各カード: パス + 説明文。badge=「Auto tracked」                                                                 |
| 6 | **Quick actions**         | col-span-3 | 右列上   | 2×3グリッド(`grid-cols-2 gap-2`)。6アクション: Open palette / Import DB / Export DB / Theme edit / Snippet / Calculator。badge=「Keyboard」  |
| 7 | **Theme controls**        | col-span-3 | 右列下   | Dark/Light選択カード(`grid-cols-2 gap-3`)。Dark: `border-cyan-400/20 bg-cyan-400/10`（選択状態）。下部に説明テキスト。badge=「Light / Dark」 |

> **Workspace ウィジェットの責務に関する注記**: Workspace は「Library のアイテムを用途別に束ねる補完画面」と定義されているが、Quick actions（Import DB / Export DB）と Theme controls はアプリ設定であり、Library アイテムとは無関係。Phase 3 でこれらを DB 永続化する際に「ウィジェットとして配置するか、固定 UI（PageTabBar 右側のテーマチップや Settings 画面）に寄せるか」の判断が必要。

##### WidgetShell（共通外枠）の構造

`Widget` コンポーネント:

- 外枠: `rounded-[24px] border border-white/10 bg-white/[0.04] p-4 pt-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]`
- `...` メニューボタン: `absolute right-3 top-3 rounded-xl border border-white/10 bg-white/[0.05] p-1.5`
  - メニュー項目: ウィジェット削除 / ウィジェット設定（ウィジェット種別により異なる項目を追加可）
- ヘッダー: アイコン(`rounded-2xl border border-white/10 bg-white/5 p-2` 内に `h-4 w-4`) + title + source + badge

#### 現行との差分

| 観点             | 現行 (`WorkspaceView.svelte`)                      | モック                                                        |
| ---------------- | -------------------------------------------------- | ------------------------------------------------------------- |
| グリッド         | `grid-cols-4` 固定                                 | `grid-cols-12` レスポンシブ                                   |
| ウィジェット数   | 4種（Favorites, Recent, Projects, WatchedFolders） | 7種（+ Visibility, Quick actions, Theme controls）            |
| ウィジェット外枠 | `WidgetCard`（ヘッダー+X+リサイズハンドル）        | `WidgetShell`（アイコン+title+badge+source+`...`メニュー）    |
| ページタブ       | ワークスペース名チップ（dblclick編集）             | ページチップ群 + テーマチップ                                 |
| テーマ切替       | なし（`.dark` CSS定義のみ）                        | タブ行右側 + Theme controls ウィジェット                      |
| リサイズ         | マウスドラッグで1-4 span                           | **[推測]** 12カラム体系に変更。D&D/リサイズの具体仕様は未確定 |
| ウィジェット追加 | `AddWidgetDialog` モーダル（4種）                  | **[推測]** 追加UIの具体導線は未確定                           |

---

## 4. 共通レイアウト仕様

### Tauri ウィンドウ構成

| 項目          | 現行                                                     | モック想定                                                                |
| ------------- | -------------------------------------------------------- | ------------------------------------------------------------------------- |
| ウィンドウ数  | 1（`tauri.conf.json` に `width: 800, height: 600` のみ） | メインウィンドウ + Palette オーバーレイ（独立 or div）                    |
| 透過設定      | なし                                                     | Palette に `transparent: true`, `decorations: false` が必要（案B 採用時） |
| `alwaysOnTop` | なし                                                     | Palette に必要（案B 採用時）                                              |
| `skipTaskbar` | なし                                                     | Palette に必要（案B 採用時）                                              |

Palette の表示方式により Tauri 側の変更スコープが変わる。→ U-01 参照。

### WindowFrame（Library / Workspace 共通外枠）

`WindowFrame` コンポーネント:

| プロパティ       | 値                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------- |
| 外枠             | `rounded-[28px] border border-white/10 bg-[#0f1117] shadow-[0_24px_80px_rgba(0,0,0,0.45)]`  |
| タイトルバー     | `h-14 grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-white/10 bg-white/5 px-5` |
| タイトルバー左   | タイトル(`text-sm font-semibold`) + サブタイトル(`text-xs font-normal text-white/40`)       |
| タイトルバー中央 | `TitleTab` ×2（Library / Workspace）                                                        |
| タイトルバー右   | `TitleAction` ボタン群                                                                      |

### TitleTab

`TitleTab` コンポーネント:

| 状態     | スタイル                                                                |
| -------- | ----------------------------------------------------------------------- |
| active   | `border-cyan-400/25 bg-cyan-400/12 text-white`                          |
| inactive | `border-white/10 bg-white/[0.03] text-white/55 hover:bg-white/[0.06]`   |
| 共通     | `rounded-2xl border px-3 py-2 text-xs transition` + アイコン(`h-4 w-4`) |

タブのラベルとアイコン:

- Library: `Archive` アイコン
- Workspace: `LayoutDashboard` アイコン

> **Palette は TitleTab ではなく TitleAction（accent トーン）として配置する。** クリックでオーバーレイを開く。これにより `activeView` は `'library' | 'workspace'` の2値で済み、タブ切替の対象は Library と Workspace のみとなる。

### TitleAction

`TitleAction` コンポーネント。3トーン:

| トーン  | スタイル                                                              |
| ------- | --------------------------------------------------------------------- |
| default | `border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.06]` |
| accent  | `border-cyan-400/20 bg-cyan-400/10 text-cyan-100`                     |
| warm    | `border-amber-400/20 bg-amber-400/10 text-amber-100`                  |

共通: `rounded-2xl border px-3 py-2 text-xs transition` + アイコン(`h-4 w-4`)

Library タイトルバーの右ボタン: Palette(accent) / Sidebar(default) / Hidden off(warm) / Settings(default)
Workspace タイトルバーの右ボタン: Palette(accent) / Safe mode(warm) / Page settings(default)

### 背景色体系

から抽出した色階層:

| 用途             | 色コード                                                                                                                                             | 使用箇所                        |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| ウィンドウ外枠   | `#0f1117`                                                                                                                                            | WindowFrame                     |
| メインコンテンツ | `#0b0f16`                                                                                                                                            | Library メインエリア、Workspace |
| ページ背景       | `#090b10`                                                                                                                                            | 最外層（ボード全体）            |
| グラデーション   | `radial-gradient(circle_at_top, rgba(41,98,255,0.16), transparent 28%)` + `radial-gradient(circle_at_right, rgba(16,185,129,0.12), transparent 24%)` | ページ背景上のアクセント        |
| Palette 背景     | `#0b0f16` opacity 92-95% + `backdrop-blur-2xl`                                                                                                       | Palette オーバーレイ            |

#### 既存トークン体系との統合方針 **[要決定]**

既存 `src/app.css` は shadcn-svelte の oklch トークン体系（`--background`, `--card`, `--popover` 等）を使用。`.dark` ルールは彩度ゼロのニュートラルグレー。モックの hex 値群（`#0f1117`, `#0b0f16` 等）はこれと色相・明度が異なる（冷たい青黒）。Phase 1 開始前に以下の方針を選択する必要がある:

- **案A（上書き）**: `.dark` ルール内の `--background`, `--card` 等をモックの hex 値に対応する oklch 値で置換。shadcn 部品も自動的にモックの色調になる。ただし shadcn 部品の想定配色が崩れるリスクあり
- **案B（新レイヤー）**: `--surface-0`, `--surface-1`, `--surface-2` 等のモック専用変数を追加。カスタムコンポーネントはこれを使い、shadcn 部品は既存トークンを維持。二重管理になるが安全
- **案C（shadcn 廃止）**: モック UI は shadcn 的な中間明度カードを使わないため、shadcn-svelte コンポーネントを今後使わない判断をし、トークンをモック基準で全面刷新

### Tone システム

`Chip` / `Tip` / `TitleAction` 等で共通使用する4トーン:

| Tone      | border           | bg               | text          | 用途例                                 |
| --------- | ---------------- | ---------------- | ------------- | -------------------------------------- |
| `default` | `white/10`       | `white/5`        | `white/70`    | 汎用チップ、非アクティブ要素           |
| `accent`  | `cyan-400/20`    | `cyan-400/10`    | `cyan-200`    | 検索UI、アクティブタブ、主要アクション |
| `warm`    | `amber-400/20`   | `amber-400/10`   | `amber-200`   | 警告・非表示制御                       |
| `success` | `emerald-400/20` | `emerald-400/10` | `emerald-200` | 完了状態、Palette内Tip                 |

`Tip` は `default` / `accent` / `success` の3トーンのみ（warm なし）。`TitleAction` は `default` / `accent` / `warm` の3トーンのみ（success なし）。

### 角丸体系

から抽出した角丸の使い分け:

| 要素                   | 角丸        | Tailwind         |
| ---------------------- | ----------- | ---------------- |
| Chip                   | full (pill) | `rounded-full`   |
| ボタン                 | 2xl (16px)  | `rounded-2xl`    |
| 結果行 / カード本体    | 22px        | `rounded-[22px]` |
| Tip / ウィジェット外枠 | 24px        | `rounded-[24px]` |
| ウィンドウ外枠         | 28px        | `rounded-[28px]` |
| パレット外枠           | 32px        | `rounded-[32px]` |
| キーヒント             | xl (12px)   | `rounded-xl`     |

---

## 5. コンポーネント一覧

### 共通部品（新規 12種）

| コンポーネント | 役割                                                              | Props（主要）                                                     | 使用画面           |
| -------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------ |
| `Chip`         | tone付きピル型ラベル                                              | `tone?: Tone`, `children`                                         | 全画面             |
| `Tip`          | 閉じられる情報バナー（Infoアイコン + テキスト + Xボタン）         | `tone?: 'default'\|'accent'\|'success'`, `children`               | 全画面             |
| `WidgetShell`  | ウィジェット外枠（icon + title + badge + source + `...`メニュー） | `title`, `icon`, `badge?`, `source?`, `children`                  | Workspace          |
| `StatCard`     | 統計値カード（ラベル + 値）                                       | `label`, `value`                                                  | Library            |
| `MoreMenu`     | `...` ポップオーバーメニュー                                      | `items: {label, action}[]`, `ariaLabel`                           | Library, Workspace |
| `WindowFrame`  | メインウィンドウ枠（タイトルバー3カラムグリッド + コンテンツ）    | `title`, `subtitle?`, `centerContent`, `rightContent`, `children` | Library, Workspace |
| `TitleTab`     | タイトルバータブボタン                                            | `icon`, `label`, `active?`                                        | 共通               |
| `TitleAction`  | タイトルバーアクションボタン                                      | `icon`, `label`, `tone?`                                          | 共通               |
| `SidebarRow`   | サイドバー行（icon + label + meta）                               | `icon`, `label`, `active?`, `meta?`                               | Library            |
| `DetailRow`    | キー・値ペア行                                                    | `label`, `value`                                                  | Library, Palette   |
| `ActionButton` | アイコン付きアクションボタン                                      | `icon`, `label`, `onClick`                                        | Library            |
| `KeyHint`      | キーボードショートカットヒント                                    | `keys`, `description`                                             | Palette            |

### Palette 系（新規 5種）

| コンポーネント        | 役割                                 | 備考                                 |
| --------------------- | ------------------------------------ | ------------------------------------ |
| `PaletteOverlay`      | パレット全体のオーバーレイコンテナ   | 現行 `CommandPalette.svelte` を置換  |
| `PaletteSearchBar`    | 検索入力 + フィルタチップ行          | 現行 `SearchInput.svelte` を拡張置換 |
| `PaletteResultRow`    | グラデーションアイコン付き結果行     | 現行 `ResultItem.svelte` を置換      |
| `PaletteQuickContext` | 右カラムの選択アイテム詳細パネル     | 完全新規                             |
| `PaletteKeyGuide`     | 最下部のキーボードショートカット一覧 | 完全新規                             |

### Library 系（新規 7種）

| コンポーネント          | 役割                                                          | 備考                            |
| ----------------------- | ------------------------------------------------------------- | ------------------------------- |
| `LibraryLayout`         | 3カラムレイアウトコンテナ                                     | 完全新規                        |
| `LibrarySidebar`        | サイドバー（プロフィール + Tip + カテゴリリスト + D&Dゾーン） | 完全新規。`DropZone` の再利用可 |
| `LibraryMainArea`       | 検索 + ソート + 統計 + カードグリッド                         | 完全新規                        |
| `LibraryCard`           | グラデーションヘッダー付きアイテムカード                      | 完全新規                        |
| `LibraryDetailPanel`    | 右カラムの選択アイテム詳細 + アクション + センシティブ制御    | 完全新規                        |
| `SensitiveControl`      | センシティブ制御セクション（非表示トグル + 説明）             | `HiddenPasswordForm` のUI統合版 |
| `QuickRegisterDropZone` | サイドバー下部のD&D登録ゾーン                                 | `DropZone` ベースで拡張         |

### Workspace 系（新規 9種）

| コンポーネント         | 役割                                               | 備考                                        |
| ---------------------- | -------------------------------------------------- | ------------------------------------------- |
| `WorkspaceLayout`      | ページタブ + Tip + ウィジェットグリッドのコンテナ  | 現行 `WorkspaceView.svelte` を置換          |
| `PageTabBar`           | ページチップ群 + 「+ Add page」 + テーマチップ     | 完全新規                                    |
| `FavoritesWidget`      | お気に入りリスト（ChevronRight付き）               | 現行 `FavoritesWidget.svelte` のUI刷新      |
| `VisibilityWidget`     | 非表示件数 + 一時表示トグル                        | 完全新規                                    |
| `RecentLaunchesWidget` | 青ドット付き最近の起動リスト + 「Open in Library」 | 現行 `RecentWidget.svelte` のUI刷新         |
| `ProjectsWidget`       | カード型3列のプロジェクト + Git ステータス         | 現行 `ProjectListWidget.svelte` のUI刷新    |
| `WatchFoldersWidget`   | 2列カードの監視フォルダ                            | 現行 `WatchedFoldersWidget.svelte` のUI刷新 |
| `QuickActionsWidget`   | 2×3グリッドのアクションボタン                      | 完全新規                                    |
| `ThemeControlsWidget`  | Dark/Light選択カード + 説明テキスト                | 完全新規                                    |

### 既存コンポーネントの扱い

| 既存コンポーネント                          | 方針                                                              |
| ------------------------------------------- | ----------------------------------------------------------------- |
| `CommandPalette.svelte`                     | `PaletteOverlay` に置換                                           |
| `SearchInput.svelte`                        | `PaletteSearchBar` に統合                                         |
| `ResultList.svelte`                         | `PaletteOverlay` 内でインライン化                                 |
| `ResultItem.svelte`                         | `PaletteResultRow` に置換                                         |
| `ItemList.svelte`                           | Library のカードグリッドに置換。テーブルUIは廃止                  |
| `ItemForm.svelte` / `ItemFormDialog.svelte` | **[推測]** 編集機能は残すが、LibraryDetailPanel からの導線に変更  |
| `CategoryManager.svelte`                    | サイドバーのカテゴリリストに統合                                  |
| `TagManager.svelte`                         | 現在未レンダリング。ソートチップ「タグ」に統合予定                |
| `WorkspaceView.svelte`                      | `WorkspaceLayout` に置換                                          |
| `WidgetGrid.svelte` / `WidgetCard.svelte`   | 12カラムグリッド + `WidgetShell` に置換                           |
| `AddWidgetDialog.svelte`                    | 7種ウィジェット対応に拡張                                         |
| `DropZone.svelte`                           | `QuickRegisterDropZone` のベースとして再利用                      |
| `SetupWizard` 一式                          | **変更なし** — 初回セットアップは独立フロー                       |
| `SettingsPanel` 一式                        | **[推測]** 配置先未確定（モーダル or タブ or ウィンドウ内ルート） |

---

## 6. 状態一覧

### 既存 store の再利用

| Store            | ファイル                                    | 再利用方針                                               |
| ---------------- | ------------------------------------------- | -------------------------------------------------------- |
| `paletteStore`   | `src/lib/state/palette.svelte.ts` (204行)   | Quick context 表示用に `selectedItem` 派生ステートを追加 |
| `itemStore`      | `src/lib/state/items.svelte.ts` (165行)     | Library のカテゴリ件数・統計データ用メソッドを追加       |
| `workspaceStore` | `src/lib/state/workspace.svelte.ts` (172行) | ページ概念の追加。ウィジェットの12カラム対応             |
| `configStore`    | `src/lib/state/config.svelte.ts` (85行)     | テーマ設定の追加                                         |
| `hiddenStore`    | `src/lib/state/hidden.svelte.ts` (42行)     | Visibility ウィジェット・センシティブ制御と接続          |

### テーマ設定の管理

テーマ設定（`mode: 'dark' | 'light'`）は **`configStore` に統合する**。独立した `themeStore` は作成しない。永続化は既存の `cmd_get_config` / `cmd_set_config` IPC で `theme_mode` キーを使う。ワークスペース固有テーマは将来課題とし、本仕様のスコープ外とする。

### 画面ローカル状態

| 状態             | 所在                                     | 型                                               | 用途                                                                                                                   |
| ---------------- | ---------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `activeView`     | `+page.svelte` (既存 `activeTab` を置換) | `'library' \| 'workspace'`                       | メインウィンドウのタブ切替。現行の `items` / `categories` タブは Library に統合。`settings` タブの配置先は U-05 で決定 |
| `selectedItemId` | Library 画面ルート                       | `string \| null`                                 | 右パネルに表示するアイテムの選択                                                                                       |
| `activeCategory` | `LibrarySidebar`                         | `string \| null`                                 | サイドバーのアクティブカテゴリ                                                                                         |
| `searchQuery`    | `LibraryMainArea`                        | `string`                                         | Library 内検索                                                                                                         |
| `sortMode`       | `LibraryMainArea`                        | `'recent' \| 'frequency' \| 'category' \| 'tag'` | ソートチップの選択状態                                                                                                 |
| `activePage`     | `WorkspaceLayout`                        | `string`                                         | ページタブの選択状態 **[要決定]** 案Aではワークスペース ID、案Bではページ ID。→ U-11                                   |
| `tipDismissed`   | 各 Tip の閉じ状態                        | `Record<string, boolean>`                        | **[推測]** localStorage 永続化                                                                                         |

#### selectedItem の所有権と画面間ナビゲーション

- `selectedItemId` は **Library 画面ローカル**。Palette の `paletteStore.selectedIndex` とは独立
- Palette の Quick context パネルは `paletteStore` 内の検索結果から派生し、Library の `selectedItemId` とは同期しない
- 画面間でアイテムを引き渡す場合は、**画面遷移時に引数として渡す**（共有 store は不要）:
  - Workspace「Open in Library」→ `activeView = 'library'` + `selectedItemId = item.id` を同時にセット
  - Palette から Library への遷移も同様のパターン（`activeView = 'library'` + `selectedItemId = item.id`）

### 不足 API（Rust IPC コマンド）

現行の IPC 層に存在しない、モックの実現に必要なコマンド:

| コマンド                  | 用途                                                                       | 返り値                   |
| ------------------------- | -------------------------------------------------------------------------- | ------------------------ |
| `cmd_get_item_stats`      | 選択アイテムの詳細情報（種別・ソース・別名・最終起動・起動回数・追跡状態） | `ItemStats`              |
| `cmd_get_library_stats`   | Library 統計（総アイテム数・今週の起動数・追跡中パス数）                   | `LibraryStats`           |
| `cmd_get_category_counts` | カテゴリ別アイテム件数                                                     | `Record<string, number>` |
| `cmd_get_hidden_count`    | 非表示アイテム件数                                                         | `number`                 |

以下は既存 IPC で対応可能:

- `cmd_search_items` — Library 内検索（`src/lib/ipc/launch.ts` に `searchItems()` として IPC ラッパー存在）
- `cmd_get_all_items` — 全アイテム取得（`itemStore` 経由）
- `cmd_get_frequent_items` — よく使うアイテム（Favorites ウィジェット）
- `cmd_get_recent_items` — 最近の起動（Recent ウィジェット）
- `cmd_get_folder_items` — フォルダアイテム（Projects ウィジェット）
- `cmd_get_watched_paths` — 監視パス（Watch folders ウィジェット）
- `cmd_launch_item` — アイテム起動
- `cmd_toggle_hidden_visibility` / `cmd_set_hidden_password` — 非表示制御

**フロントエンド IPC ラッパー欠落**: Rust 側に `cmd_update_tag`, `cmd_delete_tag` が登録済みだが、フロントエンドの IPC ラッパーが存在しない。Library ソートチップ「タグ」機能でタグ操作が必要になる場合は追加が必要。

### バックエンド前提変更一覧

モック UI の実現に必要なバックエンド変更を一覧化する。Phase 3 の見積もりに使用。

| 変更                                                                    | 影響レイヤー                                      | 関連する未確定事項                                                                         |
| ----------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| WidgetType enum に 3値追加（Visibility, Quick actions, Theme controls） | Rust + DB マイグレーション + フロントエンド型定義 | —                                                                                          |
| ページテーブル新設（案B 採用時）                                        | Rust + DB マイグレーション + IPC + フロントエンド | U-11                                                                                       |
| Item.is_hidden 直接フラグ追加（案B 採用時）                             | Rust + DB マイグレーション                        | U-12                                                                                       |
| ~~Workspace にテーマ / アクセント色フィールド追加~~                     | ~~Rust + DB マイグレーション~~                    | **削除**: テーマは `configStore` + `config` テーブルで管理。Workspace 固有テーマは将来課題 |
| `cmd_get_item_stats` 等の新規コマンド（4種）                            | Rust + IPC ラッパー                               | —                                                                                          |
| `updateTag` / `deleteTag` IPC ラッパー追加                              | フロントエンドのみ（Rust 側は実装済み）           | —                                                                                          |

---

## 7. UI 文言整理

### UIに表示する文言

#### タイトル・ラベル

| 文言                                     | 画面                   |
| ---------------------------------------- | ---------------------- |
| Desktop Overlay Palette                  | Palette ヘッダー       |
| Library & Item Registry                  | Library タイトルバー   |
| Source of truth for all registered items | Library サブタイトル   |
| Workspace Dashboard                      | Workspace タイトルバー |
| Curated views built from Library items   | Workspace サブタイトル |
| Quick context                            | Palette 右パネル       |
| Selected item                            | Library 右パネル       |
| Items / Registry                         | Library サイドバー     |
| センシティブ制御                         | Library 右パネル       |
| クイック登録                             | Library サイドバー     |

#### カテゴリ名（Library サイドバー）

| 文言             | 件数 | アイコン         |
| ---------------- | ---- | ---------------- |
| すべて           | 248  | `Archive`        |
| ゲーム           | 86   | `Gamepad2`       |
| 開発ツール       | 52   | `FolderKanban`   |
| スクリプト       | 39   | `TerminalSquare` |
| URL / Web        | 28   | `Globe`          |
| フォルダ         | 21   | `FolderOpen`     |
| デフォルト非表示 | 22   | `EyeOff`         |

**件数（248, 86 等）はモックデータであり、ハードコードしないこと。** 実装時は `cmd_get_category_counts` 等で動的に取得する。

#### 統計ラベル（Library メイン）

| ラベル     | モック値 |
| ---------- | -------- |
| 総アイテム | 248      |
| 今週の起動 | 61       |
| 追跡中パス | 94       |
| よく使う   | Top 10   |

#### ソートチップ（Library メイン）

最近使った順 / 起動回数順 / カテゴリ / タグ

#### ボタン文言

| 文言             | 画面                                    | 位置               |
| ---------------- | --------------------------------------- | ------------------ |
| 起動             | Library 右パネル                        | アクションボタン   |
| Workspaceに追加  | Library 右パネル                        | アクションボタン   |
| 編集             | Library 右パネル                        | アクションボタン   |
| 関連URL          | Library 右パネル                        | アクションボタン   |
| Open in Library  | Workspace (Recent widget)               | リンクボタン       |
| Open workspace   | Workspace (Projects widget)             | カード内ボタン     |
| Open palette     | Workspace タイトルバー                  | TitleAction        |
| Safe mode        | Workspace タイトルバー                  | TitleAction        |
| Page settings    | Workspace タイトルバー                  | TitleAction        |
| Sidebar          | Library タイトルバー                    | TitleAction        |
| Hidden off       | Library タイトルバー / Palette ヘッダー | TitleAction / Chip |
| Settings         | Library タイトルバー                    | TitleAction        |
| + Add page       | Workspace ページタブ行                  | ボタン             |
| ライブラリを検索 | Library メイン                          | 検索プレースホルダ |

#### キーボードガイド文言（Palette）

| 文言                        | 位置             |
| --------------------------- | ---------------- |
| `:dev で開発ツールのみ`     | 結果下3列チップ  |
| `= で電卓`                  | 結果下3列チップ  |
| `> で内蔵コマンド`          | 結果下3列チップ  |
| `↑ ↓ 移動`                  | 最下部キーヒント |
| `Tab 詳細`                  | 最下部キーヒント |
| `Ctrl+H 非表示アイテム表示` | 最下部キーヒント |
| `Ctrl+K アクション`         | 最下部キーヒント |

### Tip 文言（4種）

| Tip                 | Tone    | 画面      | 位置                  | 文言                                                                             |
| ------------------- | ------- | --------- | --------------------- | -------------------------------------------------------------------------------- |
| Palette Tip         | success | Palette   | Quick context 内      | 「ショートカットや別名を登録すると、数文字で目的のアプリに到達できます。」       |
| Library Sidebar Tip | accent  | Library   | サイドバー上部        | 「ここでアイテムを登録・整理します。Workspace にはよく使うものを配置できます。」 |
| Library Detail Tip  | default | Library   | 右パネル アクション下 | 「Workspace に追加しても複製は作られません。編集は Library 側で行います。」      |
| Workspace Tip       | accent  | Workspace | ページタブ行下        | 「このページはホームです。よく使うものをまとめて配置できます。」                 |

### 開発メモ（UIに出さない）

| 要素                   | 説明                                                                                                           |
| ---------------------- | -------------------------------------------------------------------------------------------------------------- |
| `SectionLabel`         | モックボード上の見出しコンポーネント（eyebrow + title + desc）。実製品UIには不要                               |
| `mockSanityChecks`     | モックデータの整合性チェック。開発時ユーティリティ                                                             |
| チップ群（ボード上部） | 「Arcagate mockups」「Windows-first」「Keyboard-centric」「Tauri + Svelte 想定」「mock data OK」— ボード説明用 |

---

## 8. 未確定事項

| ID       | 項目                                    | 詳細                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | 影響範囲                                                                   |
| -------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **U-01** | Palette の表示方式                      | **案A（現行維持）**: メインウィンドウ内 `fixed` div。実装コスト低。ただし `backdrop-blur` は OS デスクトップには適用されない。**案B（独立ウィンドウ）**: Tauri の `WebviewWindowBuilder` で新規ウィンドウ作成。`transparent: true`, `decorations: false`, `always_on_top: true`。実装コスト中〜高。Windows の `backdrop-blur` には追加のネイティブ API 呼び出しが必要。**Palette はタブではなく TitleAction（accent トーン）として配置**し、クリックでオーバーレイを開く。Library / Workspace 両方のタイトルバー右に Palette ボタンを配置する | `TitleAction`, `PaletteOverlay`, `+page.svelte`, `tauri.conf.json`         |
| **U-02** | カードグラデーション配色の決定ロジック  | モックではアイテムごとに手動設定（`art` フィールド）。自動生成するか、ユーザーが選択するか、カテゴリベースか                                                                                                                                                                                                                                                                                                                                                                                                                                  | `LibraryCard`, `PaletteResultRow`, Item データモデル                       |
| **U-03** | 統計「Top 10」のクリック挙動            | 「よく使う Top 10」カードをクリックした時の遷移先。ソートが切り替わるのか、別ビューが開くのか                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `StatCard`, `LibraryMainArea`                                              |
| **U-04** | ウィジェット追加の UI 導線              | 現行は `AddWidgetDialog` モーダル。モックには追加UIが見当たらない。ページ設定内か、`...` メニューか                                                                                                                                                                                                                                                                                                                                                                                                                                           | `WorkspaceLayout`, `AddWidgetDialog`                                       |
| **U-05** | Settings 画面の配置                     | Library/Workspace タイトルバーに Settings ボタンがあるが、遷移先が不明。モーダル / タブ / 別ルート                                                                                                                                                                                                                                                                                                                                                                                                                                            | `SettingsPanel`, ルーティング                                              |
| **U-06** | Quick context の表示タイミング          | 常時表示か、Tab キーで切り替えるか。キーヒント「Tab 詳細」は Quick context の表示切替を示唆                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `PaletteQuickContext`, `PaletteOverlay`                                    |
| **U-07** | 「関連URL」ボタンの具体挙動             | Library 右パネルの「関連URL」ボタンが何を開くか。アイテムに紐づくURLリストか、外部ブラウザか                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `LibraryDetailPanel`, `ActionButton`                                       |
| **U-08** | ウィジェット D&D vs 固定配置            | 現行は `@formkit/drag-and-drop` で D&D 対応。モックの12カラムグリッドでも D&D を維持するか、固定配置にするか                                                                                                                                                                                                                                                                                                                                                                                                                                  | `WorkspaceLayout`, `WidgetShell`                                           |
| **U-09** | LibraryCard バッジ条件ロジック          | モックのバッジ: Tracked / Alias / Hidden / Pinned / Versioned。これらの条件判定ロジックが未定義                                                                                                                                                                                                                                                                                                                                                                                                                                               | `LibraryCard`, Item データモデル                                           |
| **U-10** | Visibility 一時表示のパスワード確認有無 | `hiddenStore` にはパスワードベースの表示切替がある。モックの Visibility ウィジェットのトグルがパスワードを要求するかどうか                                                                                                                                                                                                                                                                                                                                                                                                                    | `VisibilityWidget`, `hiddenStore`                                          |
| **U-11** | ワークスペース内「ページ」の実装方針    | **[推測]** 現行バックエンドにページ概念は存在しない（Workspace → Widget のフラット2層）。モックのページチップ（Today / Game Dev 等）を **ワークスペース切替として実装する（案A）** か、**新規ページレイヤーを DB に追加する（案B）** か。案A は既存モデルで実装可能。案B は DB マイグレーション + Rust + IPC の全層変更が必要                                                                                                                                                                                                                 | `PageTabBar`, `WorkspaceLayout`, `workspaceStore`, DB スキーマ             |
| **U-12** | アイテム非表示の実装方式                | 現行はタグベース間接非表示（`Tag.is_hidden = true` のタグを付与）。`SensitiveControl` の UI を **既存タグ操作で実装する（案A）** か、**Item モデルに `is_hidden: bool` を直接追加する（案B、DB マイグレーション要）** か                                                                                                                                                                                                                                                                                                                      | `SensitiveControl`, `LibraryDetailPanel`, `hiddenStore`, Item データモデル |
| **U-13** | Palette フィルタチップの詳細振る舞い    | チップのトグル規則（排他 or 独立）、`wk:<name>` チップの追加/削除導線、ワークスペーススコープ検索の起動方法。Phase 2 の静的モックは固定チップで問題ないが、Phase 3 で接続する際に決定が必要                                                                                                                                                                                                                                                                                                                                                   | `PaletteSearchBar`, `paletteStore`                                         |

---

## 8.5. 画面間ナビゲーションフロー

§7 のボタン文言から導かれる画面遷移の一覧。Phase 4 の配線作業の参照用。

| アクション       | 起点                               | 遷移先 / 挙動                                     |
| ---------------- | ---------------------------------- | ------------------------------------------------- |
| Open in Library  | Workspace Recent widget            | `activeView='library'` + `selectedItemId=item.id` |
| Open workspace   | Workspace Projects widget          | 外部アプリ起動（`cmd_launch_item`）               |
| Palette ボタン   | Library / Workspace TitleAction    | `paletteStore.open()`（オーバーレイ表示）         |
| Sidebar          | Library TitleAction                | サイドバー表示/非表示トグル                       |
| Settings         | Library TitleAction                | **[要決定]** U-05                                 |
| 起動             | Library 右パネル                   | `cmd_launch_item`                                 |
| Workspace に追加 | Library 右パネル                   | `cmd_add_widget`（favorites）or 未定義            |
| 編集             | Library 右パネル                   | `ItemFormDialog` モーダル表示                     |
| 関連URL          | Library 右パネル                   | **[要決定]** U-07                                 |
| Safe mode        | Workspace TitleAction              | `hiddenStore` 一時表示トグル                      |
| Page settings    | Workspace TitleAction              | **[推測]** ページ設定モーダル or ウィジェット追加 |
| + Add page       | Workspace PageTabBar               | 新規ワークスペース作成（U-11 方針に依存）         |
| Hidden off       | Library TitleAction / Palette Chip | `hiddenStore` トグル。`Ctrl+H` と同期             |

---

## 9. 推奨実装順序

### 横断方針

**アクセシビリティ**: 新規33コンポーネントには、JSX モックに記載の `aria-label`（例: `aria-label="閉じる"`、`aria-label="${item.title} のメニュー"`）を引き継ぐ。インタラクティブ要素にはキーボードフォーカス管理（`tabindex`、`focus-visible`）を実装する。

**レスポンシブ / リサイズ**: Tauri ウィンドウは `resizable: true`。モックは固定幅前提のレイアウト（Library: `250px + flex + 340px`）だが、最小ウィンドウサイズ（**[推測]** `minWidth: 800, minHeight: 600`）を設定し、それ以下では横スクロールを許容する。サイドバーの折りたたみ等の狭小表示対応は将来課題とする。

### Phase 1: デザイントークン + 共通部品

**目的**: モック全体で使い回す基盤を先に固める。

| ステップ | 内容                                                                 | 成果物                                                            |
| -------- | -------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 1-1      | CSS 変数追加（背景色体系・Tone カラー・角丸トークン）                | `src/app.css` 更新                                                |
| 1-2      | `Chip` コンポーネント                                                | `src/lib/components/common/Chip.svelte`                           |
| 1-3      | `Tip` コンポーネント                                                 | `src/lib/components/common/Tip.svelte`                            |
| 1-4      | `TitleTab` + `TitleAction`                                           | `src/lib/components/common/TitleTab.svelte`, `TitleAction.svelte` |
| 1-5      | `WindowFrame`                                                        | `src/lib/components/common/WindowFrame.svelte`                    |
| 1-6      | `WidgetShell` + `MoreMenu`                                           | `src/lib/components/common/WidgetShell.svelte`, `MoreMenu.svelte` |
| 1-7      | `StatCard` / `SidebarRow` / `DetailRow` / `ActionButton` / `KeyHint` | `src/lib/components/common/` 内                                   |

### Phase 2: 静的モック（データ接続なし）

**目的**: 各画面のレイアウトとビジュアルをモック画像に合わせる。

| ステップ | 内容                                                             | 成果物                               |
| -------- | ---------------------------------------------------------------- | ------------------------------------ |
| 2-1      | `+page.svelte` を Library/Workspace 2タブ化 + `WindowFrame` 統合 | ルーティング更新                     |
| 2-2      | Library 静的レイアウト（3カラム + カード + 右パネル）            | `src/lib/components/library/` 新規   |
| 2-3      | Workspace 静的レイアウト（12カラムグリッド + 7ウィジェット）     | `src/lib/components/workspace/` 更新 |
| 2-4      | Palette 静的レイアウト（2カラム + Quick context）                | `src/lib/components/palette/` 更新   |

**Phase 2 のフォールバック**: 静的モックではデータ接続なしで画面を組むため、以下のフォールバック表示を含める:

- LibraryCard のグラデーション色: U-02 未決定のため、カテゴリ別の仮配色を使用（exe=cyan/violet, url=orange/amber, folder=emerald/teal, script=pink/rose）
- 右パネルのアイテム未選択時: 「アイテムを選択してください」プレースホルダ表示
- Workspace でウィジェットが0個の時: 「ウィジェットを追加してください」プレースホルダ + 追加ボタン

### Phase 3: 状態導入

**バックエンド前提条件**（Phase 3 開始前に実施すること）:

新規ウィジェット3種（Visibility, Quick actions, Theme controls）を DB に永続化するには:

1. `src-tauri/src/models/workspace.rs` の `WidgetType` enum に3値追加（現行は `favorites | recent | projects | watched_folders` の4種のみ）
2. DB マイグレーション SQL で CHECK 制約を更新
3. フロントエンド型定義 `src/lib/types/workspace.ts` の `WidgetType` 更新

**目的**: store 接続によりデータを流す。

| ステップ | 内容                                                                | 成果物                       |
| -------- | ------------------------------------------------------------------- | ---------------------------- |
| 3-1      | `itemStore` 拡張（カテゴリ件数・統計・検索） + 不足 IPC 追加        | state/ + ipc/ + Rust側       |
| 3-2      | Library → `itemStore` 接続（カテゴリフィルタ・ソート・選択）        | Library コンポーネント更新   |
| 3-3      | `workspaceStore` 拡張（ページ概念・12カラム対応）                   | state/ + Rust側              |
| 3-4      | Workspace → `workspaceStore` 接続                                   | Workspace コンポーネント更新 |
| 3-5      | Palette → `paletteStore` 拡張（Quick context 用 selectedItem 派生） | Palette コンポーネント更新   |

### Phase 4: 配線 + 仕上げ

**目的**: 画面間の導線・インタラクション・テーマを完成させる。

| ステップ | 内容                                                                             | 成果物                                              |
| -------- | -------------------------------------------------------------------------------- | --------------------------------------------------- |
| 4-1      | タブ切替（Library ↔ Workspace） + Palette 起動導線（TitleAction 経由）           | `+page.svelte`, `TitleTab`, `TitleAction`           |
| 4-2      | Library インタラクション（カード選択 → 右パネル更新、アクションボタン、D&D登録） | Library コンポーネント                              |
| 4-3      | Workspace インタラクション（ページ追加/切替、「Open in Library」遷移）           | Workspace コンポーネント                            |
| 4-4      | `configStore` テーマ設定 + テーマ切替 UI（Dark/Light トグル、CSS変数切替）       | state/ + ThemeControlsWidget                        |
| 4-5      | Tip 永続化（localStorage で閉じ状態を保存）                                      | Tip コンポーネント                                  |
| 4-6      | Visibility / センシティブ制御の接続                                              | `hiddenStore` + VisibilityWidget + SensitiveControl |
