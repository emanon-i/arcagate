# Image Scrap Widget (画像スクラップ)

> widgetType: `image_scrap` / category: memo / 配置画面: [Workspace](../screens/workspace.md)

## 目的

画像ファイルを D&D で workspace に配置し、widget として表示する scrapbook。元ファイルを APPDATA に copy して安定参照する。

## やること (必要処理)

- 画像選択時に `cmd_save_image_scrap` で `%APPDATA%/image-scraps/<uuid>.<ext>` に copy
- copy 先 path を `convertFileSrc` で asset:// URL 化し img 表示
- 読み込み失敗を検出して error state 表示
- double-click で元ファイル (source_path 優先) を OS default で開く

## やらないこと (禁止 / scope 外)

- 画像の最適化 / リサイズ / サムネイル生成をしない (原寸 copy のみ)
- 対応外拡張子を受け付けない (png / jpg / jpeg / gif / webp / svg / bmp の allowlist)
- 元ファイルを移動・削除しない (copy のみ)
- 画像編集をしない (表示のみ)

## 性能予算

- file copy + UUID 生成は backend 1 回。表示は webview の asset protocol に委譲

## 副作用 (state 変化 / persistence)

- `%APPDATA%/image-scraps/<uuid>.<ext>` に画像ファイルを生成
- widget config (`path` / `source_path`) を `workspace_widgets.config` JSON に保存

## 依存

- IPC: `cmd_save_image_scrap` / `cmd_open_path`
- config schema: `path` (APPDATA 内 copy) / `source_path` (元ファイル)
- backend: [Image Scrap Service](../backend/image-scrap-service.md)

## 既知の判断

- `path` (APPDATA 内、表示用・安定参照) と `source_path` (元ファイル、double-click 起点) を分離保持
