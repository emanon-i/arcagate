# Theme Service

> backend feature / レイヤー: commands → service → repository → SQLite

## 目的

UI theme (builtin + user custom) の CRUD と active theme の管理を担う backend feature。

## やること (必要処理)

- theme の create / list / get / update / delete
- css_vars JSON の検証、base_theme 値 (dark / light) の検証
- active theme mode の取得 / 設定
- active theme を削除した場合は default へ reset
- カスタムテーマ件数の上限管理 (PH-CF-800 F6、 `MAX_CUSTOM_THEMES` = 50)
- `themes.sort_order` に基づく明示順 (PH-CF-800 F1、 migration 041)

## やらないこと (禁止 / scope 外)

- CSS のコンパイル / 派生計算をしない (派生は frontend の CSS native 計算 — [Design Tokens](../cross-cutting/design-tokens.md))
- theme の画像アセット管理をしない
- 英名 ABC 順での並び替えをしない (PH-CF-800 F1 で `sort_order` 経由に統一)

## 性能予算

- 単純な DB CRUD。theme 適用 (DOM 反映) は frontend 側

## 副作用 (state 変化 / persistence)

- `themes` テーブルへ write、active theme mode を `config` テーブルに保存

## 依存

- repository: `theme_repository` / `config_repository`
- DB: `themes` / `config`
- 依存される: Settings 画面 (Appearance)

## 機能契約

### テーマ複製契約 (PH-CF-800 F3)

「現在のテーマを複製」 (`cloneCurrentTheme`) は **選択中テーマ (`activeMode`) を厳密に複製** する。 frontend は複製ソースを `themes` 配列から探し、 見つからなければ:

- ボタンを `disabled` にする (themes 未ロード時 / activeMode が themes に不在の race)、 または
- toast でエラーを返す (動的呼出時)

「ソース不在 → デフォルト (`base_theme='dark'` / `css_vars='{}'`) で代用」 のような **黙ったフォールバックは禁止** (user は「複製したつもりが全く別の theme になった」 と困惑)。

#### 機械検出

- frontend unit / e2e: テーマ B を select 中に「現在のテーマを複製」 → 複製された theme の `css_vars` が B と一致 (デフォルトでない) ことを assert。

### カスタムテーマ上限契約 (PH-CF-800 F6)

`create_theme` と `import_theme_json` の双方で同一の `MAX_CUSTOM_THEMES` (現状 50) を検査する。 上限到達時は `AppError::InvalidInput("custom theme limit reached (N / MAX)")` を返す。 UI (`SettingsAppearancePane`) は `cmd_get_custom_theme_quota` で「N / MAX」 を常時表示し、 上限到達で「複製」 / 「インポート」 ボタンを `disabled` にする。

`MAX_CUSTOM_THEMES` を変える場合は backend / UI 文言 / 本契約 doc の 3 箇所を同時に更新する。

#### 機械検出

- Rust unit `test_create_theme_enforces_custom_theme_limit` / `test_import_theme_enforces_custom_theme_limit`: MAX 本作成後に追加で create / import すると `InvalidInput` が返ること。
- Rust unit `test_count_custom_themes`: builtin を除く件数を正しく数える。

## 既知の判断

- builtin theme 6 本は seed + aesthetic primitive の組合せ。 旧 builtin は migration 032 / 041 で廃止 (HUD は PH-CF-800 F1 で user 判断により削除)
- 並び順は `themes.sort_order` 列で明示し、 builtin は migration 041 で seed (custom は NULL、 name 順 fallback)
- `MAX_CUSTOM_THEMES = 50` は daily-use launcher の典型範囲 (< 10) を大きく上回り、 import loop の stop-loss として機能する緩い上限
