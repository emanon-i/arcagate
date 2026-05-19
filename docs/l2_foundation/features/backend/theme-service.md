# Theme Service

> backend feature / レイヤー: commands → service → repository → SQLite

## 目的

UI theme (builtin + user custom) の CRUD と active theme の管理を担う backend feature。

## やること (必要処理)

- theme の create / list / get / update / delete
- css_vars JSON の検証、base_theme 値 (dark / light) の検証
- active theme mode の取得 / 設定
- active theme を削除した場合は default へ reset

## やらないこと (禁止 / scope 外)

- CSS のコンパイル / 派生計算をしない (派生は frontend の CSS native 計算 — [Design Tokens](../cross-cutting/design-tokens.md))
- theme の画像アセット管理をしない
- theme の並び替えをしない

## 性能予算

- 単純な DB CRUD。theme 適用 (DOM 反映) は frontend 側

## 副作用 (state 変化 / persistence)

- `themes` テーブルへ write、active theme mode を `config` テーブルに保存

## 依存

- repository: `theme_repository` / `config_repository`
- DB: `themes` / `config`
- 依存される: Settings 画面 (Appearance)

## 既知の判断

- builtin theme 5 本は seed + aesthetic primitive の組合せ。旧 builtin は migration 032 で廃止
