---
id: PH-CF-700
status: planning
batch: clean-feedback
type: 改善
era: Distribution Hardening
parent: README.md
---

# PH-CF-700: ライブラリ画面 UX + 背景

## 元 user fb (検収項目)

- **C5**: 複数選択をアイコンボタン化し「アイテム追加」 の左へ。 追加ボタンを最右に
- **C6**: 左サイドバーのタグ名横アイコンが workspace アイコン → タグらしいアイコンに
- **C8**: ライブラリ画面の背景を変えたい

## 引用元 guideline doc

| Doc                                                           | Section                              | 採用判断への寄与                 |
| ------------------------------------------------------------- | ------------------------------------ | -------------------------------- |
| `docs/l2_foundation/features/screens/library.md`              | ツールバー / サイドバー              | ボタン配置・アイコンの契約       |
| `docs/l2_foundation/features/backend/wallpaper-service.md`    | 壁紙                                 | wallpaper の格納先抽象           |
| `CLAUDE.md`                                                   | `<critical-rule id="label-content">` | アイコンボタンは aria-label 必須 |
| `docs/l3_phases/_archive/PH-issue-009_workspace-wallpaper.md` | workspace 壁紙                       | 既存 wallpaper 実装の流用        |

## Fact 確認 (root cause / 現状)

### C5: ツールバーのボタン配置

`LibrarySortControls.svelte:34-129` のツールバー並び = `[非表示トグル][sort field select][sort order][grid][list][アイテム追加 (:109-117)][複数選択トグル (:118-128)]`。 複数選択トグルは現状テキストボタン (`{selectionMode ? t('selection_end') : t('selection_start')}`) で最右。 「アイテム追加」 はその左でテキスト + `Plus`。 希望は「複数選択をアイコンボタン化 → アイテム追加 の左」 / 「追加ボタンを最右」。

### C6: タグ名横アイコンが workspace アイコン

`LibrarySidebar.svelte:125` ユーザータグ行が `icon={LayoutDashboard}` (= workspace 用アイコン、 `:2` で import)。 同 `LayoutDashboard` は `:77` (Type タグの fallback)、 `:102` (workspace タグ、 ここは妥当) でも使用。 ユーザータグにタグらしいアイコンが無い。

### C8: ライブラリ画面の背景

既存 wallpaper 構造 (workspace 用):

- Rust: `wallpaper_service.rs` — `save_wallpaper_file` (`<app_data_dir>/wallpapers/<uuid>.<ext>` へコピー、 png/jpg/jpeg/webp)、 `set_workspace_wallpaper` (opacity 0-1 / blur 0-40 clamp)。 migration `018_workspace_wallpaper.sql`
- データ: `workspace` テーブルに `wallpaper_path` / `wallpaper_opacity` / `wallpaper_blur` 列 (**per-workspace**)
- 描画: `WorkspaceGrid.svelte:278-285` — `convertFileSrc` で `asset://` 化し `z-0` レイヤーに `background-image` + `opacity` + `filter: blur()`
- UI: `WorkspaceWallpaperDialog.svelte`

ライブラリ画面は「複数インスタンス」 概念が無い単一画面。 `save_wallpaper_file` は **workspace 非依存** なので流用可。 差分は格納先 (workspace 行 → config テーブル) と描画箇所 (`WorkspaceGrid` → `LibraryLayout`)。

## スコープ

ライブラリ画面の UX 小改善 2 件 (C5 / C6) と背景機能の追加 (C8)。

## やらないこと

- ライブラリ画面のバグ修正 — PH-CF-600
- workspace 壁紙の挙動変更 — 既存のまま流用
- wallpaper の動画 / アニメーション対応 — 静止画のみ (既存と同じ)

## 具体タスク

1. **C5**: `LibrarySortControls.svelte` で (a) 複数選択トグル (`:118-128`) を他のアイコンボタンと同形 (`p-2`、 例 `ListChecks` / `CheckSquare`) のアイコンのみボタンに、 (b) DOM 順を「複数選択トグル → アイテム追加」 へ入れ替えて追加ボタンを最右に。 `aria-label` を維持
2. **C6**: `LibrarySidebar.svelte:125` の `icon={LayoutDashboard}` を `Tag` (`@lucide/svelte`) 等のタグアイコンへ。 `:77` の Type タグ fallback も `LayoutDashboard` のため、 未知 type 時に workspace アイコンが出ないよう汎用アイコンに変更
3. **C8 backend**: `config` テーブルに `library_wallpaper_path` / `library_wallpaper_opacity` / `library_wallpaper_blur` のグローバル設定キーを追加 (migration)。 `wallpaper_service` に config 版 setter を新設 (`save_wallpaper_file` は流用)。 IPC 追加
4. **C8 描画**: `LibraryLayout.svelte:86` のルート配下に `WorkspaceGrid.svelte:278-285` と同型の `z-0` wallpaper レイヤーを追加
5. **C8 UI**: `WorkspaceWallpaperDialog.svelte` を workspace_id 非依存に汎用化するか、 設定画面に Library wallpaper セクションを追加

## 受け入れ条件 (機械検出)

- [ ] C5: e2e — ライブラリツールバーのボタン DOM 順が `[... 複数選択トグル][アイテム追加]` (追加が最右)、 複数選択トグルが `aria-label` 付きアイコンボタン
- [ ] C6: ユーザータグ行のアイコンが `LayoutDashboard` でない (grep / snapshot)
- [ ] C8: e2e — Library に画像を設定 → ライブラリ画面に背景が表示、 opacity / blur が反映。 アプリ再起動後も保持
- [ ] C8: unit — `library_wallpaper_*` の config キーが clamp (opacity 0-1 / blur 0-40) される

## 機能契約の追記

`features/screens/library.md`:

> **ツールバー契約**: ライブラリツールバーのアクションボタンはアイコンボタンに統一し `aria-label` を持つ。 「アイテム追加」 は最右。
>
> **サイドバーアイコン契約**: タグ行のアイコンは tag を表すアイコン、 workspace 行は workspace アイコン。 fallback アイコンに workspace アイコンを使わない。

`features/backend/wallpaper-service.md`:

> **wallpaper 格納先契約**: `save_wallpaper_file` は workspace 非依存。 wallpaper を持つ対象 (workspace / Library 画面) ごとに格納先 (workspace 行 / config キー) を選び、 描画は共通の `z-0` レイヤーパターン (`background-image` + `opacity` + `blur`) を使う。 opacity 0-1 / blur 0-40 の clamp は全対象共通。

機械検出: C8 の clamp unit test、 C5/C6 の snapshot を回帰テストに。

## 横展開

- wallpaper を持つ画面が今後増えた場合に備え、 描画レイヤーを共通コンポーネント化できるか所見を doc に残す (本 PH では Library のみ実装)
- `LayoutDashboard` を fallback に使う他箇所 (`LibrarySidebar.svelte:77`) を同時に修正

## 工数感

| Task                                   | 工数   |
| -------------------------------------- | ------ |
| C5 ツールバー配置                      | 0.5 日 |
| C6 アイコン変更                        | 0.5 日 |
| C8 backend (migration + service + IPC) | 2 日   |
| C8 描画 + UI                           | 1.5 日 |
| test                                   | 1 日   |

合計: 約 1 週間。

## 依存・着手順

- **先行**: なし
- **後続**: なし

## 参照

- `src/lib/components/arcagate/library/LibrarySortControls.svelte:34-129`
- `src/lib/components/arcagate/library/LibrarySidebar.svelte:2, 77, 102, 125`
- `src/lib/components/arcagate/library/LibraryLayout.svelte:86`
- `src-tauri/src/services/wallpaper_service.rs`
- `src/lib/components/arcagate/workspace/WorkspaceGrid.svelte:278-285`
- `src/lib/components/arcagate/workspace/WorkspaceWallpaperDialog.svelte`
- `docs/l3_phases/_archive/PH-issue-009_workspace-wallpaper.md`
