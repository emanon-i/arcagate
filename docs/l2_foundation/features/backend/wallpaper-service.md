# Wallpaper Service

> backend feature / レイヤー: commands → service → repository → SQLite + filesystem

## 目的

Workspace ごとの背景画像 (壁紙) を保存・適用する backend feature。opacity / blur を per-workspace で持つ。

## やること (必要処理)

- `save_wallpaper_file`: 画像を `%APPDATA%/wallpapers/<uuid>.<ext>` に copy
- `set_workspace_wallpaper`: workspace に path / opacity / blur を保存
- 拡張子 allowlist (png / jpg / jpeg / webp) 検証
- opacity (0.0-1.0) / blur (0-40) を clamp

## やらないこと (禁止 / scope 外)

- 画像の前処理 / リサイズをしない
- allowlist 外の拡張子を受け付けない
- workspace 以外への壁紙適用をしない (デスクトップ壁紙等は対象外)

## 性能予算

- file copy 1 回 + DB update。画像処理なし

## 副作用 (state 変化 / persistence)

- `%APPDATA%/wallpapers/<uuid>.<ext>` を生成
- `workspaces` テーブルの `wallpaper_path` / `wallpaper_opacity` / `wallpaper_blur` を更新

## 依存

- repository: `workspace_repository`
- DB: `workspaces`
- 依存される: Workspace 画面

## 既知の判断

- path は forward slash 正規化 (asset:// protocol の load 安定化)
