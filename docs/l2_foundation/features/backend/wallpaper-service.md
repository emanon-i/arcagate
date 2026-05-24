# Wallpaper Service

> backend feature / レイヤー: commands → service → repository → SQLite + filesystem

## 目的

背景画像 (壁紙) を保存・適用する backend feature。 適用対象は (a) Workspace ごと (per-workspace、 opacity / blur も per-workspace 保持) と (b) Library 画面のグローバル単一値 (PH-CF-700 C8 で追加)。

## やること (必要処理)

- `save_wallpaper_file`: 画像を `%APPDATA%/wallpapers/<uuid>.<ext>` に copy (workspace / Library 共用)
- `set_workspace_wallpaper`: workspace に path / opacity / blur を保存 (workspaces 行)
- `get_library_wallpaper` / `set_library_wallpaper`: Library 画面のグローバル壁紙を取得 / 設定 (config table の `library_wallpaper_*` キー)
- 拡張子 allowlist (png / jpg / jpeg / webp) 検証
- opacity (0.0-1.0) / blur (0-40) を clamp (workspace / Library 共通定数で揃える)

## やらないこと (禁止 / scope 外)

- 画像の前処理 / リサイズをしない
- allowlist 外の拡張子を受け付けない
- 動画 / アニメーションを受け付けない (静止画のみ、 workspace / Library 同方針)
- workspace / Library 以外への壁紙適用をしない (デスクトップ壁紙等は対象外)

## 性能予算

- file copy 1 回 + DB update。画像処理なし

## 副作用 (state 変化 / persistence)

- `%APPDATA%/wallpapers/<uuid>.<ext>` を生成
- `workspaces` テーブルの `wallpaper_path` / `wallpaper_opacity` / `wallpaper_blur` を更新 (per-workspace)
- `config` テーブルの `library_wallpaper_path` / `library_wallpaper_opacity` / `library_wallpaper_blur` を更新 (Library グローバル)

## 依存

- repository: `workspace_repository` (per-workspace), `config_repository` (Library グローバル)
- DB: `workspaces` (per-workspace), `config` (Library グローバル KV)
- 依存される: Workspace 画面 (`WorkspaceGrid`), Library 画面 (`LibraryLayout`)

## 機能契約

### 壁紙格納先契約 (PH-CF-700 C8)

`save_wallpaper_file` は **workspace 非依存**。 wallpaper を持つ対象 (workspace / Library 画面) ごとに格納先 (workspace 行 / config キー) を選び、 描画は共通の `z-0` レイヤーパターン (`pointer-events-none` + `absolute inset-0 z-0` + `background-image` + `opacity` + `filter: blur`) を使う。

- **格納先**: per-workspace は `workspaces` 行の `wallpaper_*` 列。 Library グローバルは `config` 表の `library_wallpaper_path` / `_opacity` / `_blur` キー。
- **clamp 範囲**: opacity `0.0..1.0`、 blur `0..40` (px) — 対象を問わず service 側で同じ定数 (`MIN_OPACITY` / `MAX_OPACITY` / `MIN_BLUR` / `MAX_BLUR`) を共有して clamp する。
- **拡張子 allowlist**: png / jpg / jpeg / webp。 対象を問わず `validate_extension` で同じ allowlist。
- **描画レイヤー**: `pointer-events-none absolute inset-0 z-0 bg-cover bg-center bg-no-repeat motion-reduce:!filter-none`、 inline style で動的 `background-image` / `opacity` / `filter: blur(<n>px)`。 reduce-motion は blur 無効化。

#### 機械検出

- unit test `test_set_library_wallpaper_clamps_opacity_and_blur` / `test_set_library_wallpaper_clamps_negative`: 範囲外 (`opacity=5.0` / `blur=999` / `opacity=-0.5` / `blur=-10`) で clamp が効くこと。
- unit test `test_set_library_wallpaper_path_none_clears`: `path = None` で壁紙クリアできること。
- unit test `test_get_library_wallpaper_defaults_to_seed`: migration 040 で seed された default (opacity 0.6 / blur 0) を返すこと。
- e2e: Library に画像設定 → 画面に背景描画、 opacity / blur slider が反映、 アプリ reload 後も保持される (`tests/e2e/ph-cf-700-library-ux-wallpaper.spec.ts`)。

## 既知の判断

- path は forward slash 正規化 (asset:// protocol の load 安定化)
- Library 壁紙を per-workspace ではなく config table のグローバル KV にした理由: ライブラリは「複数インスタンス」 概念が無い単一画面のため、 行ベースではなく KV で十分。 migration 040 で default 値 (opacity 0.6 / blur 0) を `INSERT OR IGNORE` で seed し、 「未設定 = path 空文字 = `None`」 と扱う。
- 共通描画レイヤーを抽象 component 化するかは将来の wallpaper 対象が増えた段階で再検討 (本 PH では Library のみ追加、 描画コードを 2 箇所に DRY せず素直にコピー)。
