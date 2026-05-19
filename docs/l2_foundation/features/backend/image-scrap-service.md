# Image Scrap Service

> backend feature / レイヤー: commands → service → filesystem

## 目的

Image Scrap widget 用に、選択された画像ファイルを APPDATA に copy する backend feature。

## やること (必要処理)

- `save_image_scrap`: 元ファイルを `%APPDATA%/image-scraps/<uuid>.<ext>` に copy
- 拡張子 allowlist (png / jpg / jpeg / gif / webp / svg / bmp) を検証
- path の forward slash 正規化 (asset:// protocol 互換)

## やらないこと (禁止 / scope 外)

- 画像の最適化 / リサイズ / サムネイル生成をしない
- allowlist 外の拡張子を受け付けない
- 元ファイルを移動・削除しない (copy のみ)

## 性能予算

- file copy + UUID 生成の 1 回。画像処理なし

## 副作用 (state 変化 / persistence)

- `%APPDATA%/image-scraps/<uuid>.<ext>` を生成、ディレクトリ作成

## 依存

- crate: `uuid`
- 依存される: Image Scrap widget

## 既知の判断 / セキュリティ

- 拡張子 allowlist + 元ファイル存在確認
