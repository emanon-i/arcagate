# Metadata Service

> backend feature / レイヤー: commands → service → repository → SQLite + filesystem

## 目的

Library カード表示用に item の type 別 metadata (ファイルサイズ / フォルダ子要素数 / 画像寸法 / URL ドメイン) を取得する backend feature。

## やること (必要処理)

- `get_item_metadata`: item_id から type 別 metadata を 1 件取得
- `get_items_metadata_batch`: 複数 item の metadata を一括取得 (Library 一覧の per-card IPC 並列を回避)
- file: size + 更新時刻。画像拡張子なら header 直読みで width / height / format
- folder: 直下の子要素数 + 合計容量 (shallow scan)
- url: scheme://host からドメイン抽出

## やらないこと (禁止 / scope 外)

- **非画像ファイルのハンドルを開かない** (Defender real-time scan を誘発し freeze する真因。拡張子判定を `File::open` の前に必ず行う — #524)
- フォルダ容量を再帰集計しない (直下のみ。性能優先)
- 動画 / 音声 / zip 等の中身メタデータを取らない
- DB lock を握ったまま filesystem I/O をしない (lock 解放後に stat)
- 失敗時に UI を崩さない (空 metadata を返す best-effort)

## 性能予算

- `cmd_get_items_metadata_batch` は `spawn_blocking` で worker thread に逃がし main thread を block しない
- batch は DB lookup を lock 1 回でまとめ、lock 解放後に FS stat を実行
- 画像 header 読みは PNG/GIF 数十 byte、JPEG 最大 64KB

## 副作用 (state 変化 / persistence)

- なし (read-only。filesystem stat と DB read のみ)

## 依存

- repository: `item_repository`
- DB: `items`
- 依存される: Library 画面 (card metadata 表示)

## 既知の判断

- 画像寸法は外部 crate なしで PNG / JPEG / GIF の header を直読み
- 非画像で `File::open` を走らせると SMR HDD + Defender で cold 19.5 秒の freeze (#524 実測)。拡張子 allowlist (png/jpg/jpeg/gif) で open 前に判定する契約は厳守
