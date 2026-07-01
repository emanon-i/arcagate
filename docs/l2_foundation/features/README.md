# Functional Specs (機能契約)

Arcagate の全 feature / module の **機能契約 (Functional Spec)**。各 feature が「何をやるか」だけでなく **「何をやらないか」** を明示し、不要処理の混入を構造的に防ぐ。

## なぜこの doc 群があるか

2026-05-19 の Library freeze (#524) の真因は「機能契約が docs に無く、metadata 取得が非画像 file のハンドルまで開いて Defender scan を誘発しても、それが**契約違反だと気づける規範が無かった**」こと。各 feature の「やらないこと」を明文化すれば、実装が契約から逸脱したとき review / audit で検出できる。

## フォーマット

各 spec ファイルは固定 7 セクション:

| section           | 役割                                                                                      |
| ----------------- | ----------------------------------------------------------------------------------------- |
| 目的              | ユーザに何を提供するか (1-3 文)                                                           |
| やること          | 実装上必要な処理                                                                          |
| **やらないこと**  | 禁止 / scope 外。**事故防止の本丸**。「別 feature の責務」「性能 / 安全上やらない」を明示 |
| 性能予算          | 体感目標を数値で                                                                          |
| 副作用            | DB / localStorage / file / tray 等の永続化                                                |
| 依存              | 依存する / される feature・テーブル・IPC・token                                           |
| 既知の判断 (任意) | 意識的に採用した方針 / トレードオフ                                                       |

コード詳細 (関数名・行番号) は書かない。機能契約のみ。

## 構成

### 画面 (screens/) — 6

- [Workspace](./screens/workspace.md) — widget を配置する無限 canvas
- [Library](./screens/library.md) — 全 item 一覧 / 登録 / 起動 (default 画面)
- [Palette](./screens/palette.md) — グローバル launcher (Ctrl+Shift+Space)
- [Settings](./screens/settings.md) — アプリ全体設定 (6 ペイン)
- [Setup Wizard / Onboarding](./screens/onboarding.md) — 初回起動ウィザード
- [Activity](../screens/activity.md) — 活動インサイト (V2、 Library/Workspace と並ぶ第 3 画面)

### Widget (widgets/) — 15

| spec                                                | category | 概要                                   |
| --------------------------------------------------- | -------- | -------------------------------------- |
| [Item](./widgets/item.md)                           | library  | pin した item コレクション             |
| [Favorites](./widgets/favorites.md)                 | library  | お気に入り item 一覧                   |
| [Recent](./widgets/recent.md)                       | library  | 最近起動した item                      |
| [Stats](./widgets/stats.md)                         | info     | 起動頻度の上位 item                    |
| [フォルダ監視 (Projects)](./widgets/projects.md)    | watch    | 監視フォルダの Git project 一覧        |
| [Exe Folder Watch](./widgets/exe-folder.md)         | watch    | 監視フォルダの exe 自動列挙            |
| [Script Folder Watch](./widgets/script-folder.md)   | watch    | 監視フォルダの script 列挙・実行       |
| [Quick Note](./widgets/quick-note.md)               | memo     | 自動保存メモ                           |
| [Daily Task](./widgets/daily-task.md)               | memo     | チェックリスト                         |
| [Snippet](./widgets/snippet.md)                     | memo     | 定型文コピー                           |
| [File Preview](./widgets/file-preview.md)           | memo     | text ファイルプレビュー                |
| [Image Scrap](./widgets/image-scrap.md)             | memo     | 画像スクラップ                         |
| [Clipboard History](./widgets/clipboard-history.md) | tool     | クリップボード履歴                     |
| [File Search](./widgets/file-search.md)             | tool     | フォルダ内ファイル検索                 |
| [System Monitor](./widgets/system-monitor.md)       | info     | CPU / メモリ / ディスク / ネットワーク |

> Clock widget は 4 回改修しても体感品質が改善せず廃止済 (lessons.md / migration 021)。spec なし。

### Backend service (backend/) — 20

- [Item Service](./backend/item-service.md) — item CRUD / 検索
- [Tag Service](./backend/tag-service.md) — tag / starred
- [Launcher](./backend/launcher.md) — item 起動 / Opener
- [Icon Service](./backend/icon-service.md) — icon 抽出 / cache
- [Metadata Service](./backend/metadata-service.md) — file 情報取得
- [Folder Watch Service](./backend/folder-watch.md) — FS 監視
- [Exe Scanner Service](./backend/exe-scanner.md) — exe 列挙
- [Script Runner Service](./backend/script-runner.md) — script 実行
- [File Search Service](./backend/file-search-service.md) — ファイル列挙
- [File Preview Service](./backend/file-preview-service.md) — text 読取
- [Image Scrap Service](./backend/image-scrap-service.md) — 画像 copy
- [System Monitor Service](./backend/system-monitor-service.md) — リソース取得
- [Theme Service](./backend/theme-service.md) — theme CRUD
- [Config Service](./backend/config-service.md) — key-value 設定
- [Workspace Service](./backend/workspace-service.md) — workspace / widget CRUD
- [Wallpaper Service](./backend/wallpaper-service.md) — 壁紙保存
- [Export / Import Service](./backend/export-import.md) — JSON backup / reset
- [Activity Recorder](./backend/activity-recorder.md) — 活動ログ収集 (V2、 窓/実操作/メディア/ファイル操作)
- [Activity Store](./backend/activity-store.md) — 統合時系列ストア (V2、 retention/downsampling)
- [Activity CLI](./backend/activity-cli.md) — `arcagate_cli` の活動クエリ/抽出 (V2、 Obsidian export)

### Cross-cutting (cross-cutting/) — 10

- [Design Tokens](./cross-cutting/design-tokens.md) — token system (規範本体は `../design-tokens.md`)
- [i18n](./cross-cutting/i18n.md) — 文言判定 (規範本体は `../i18n-policy.md`)
- [永続化](./cross-cutting/persistence.md) — SQLite / migration / APPDATA
- [Auto Update](./cross-cutting/auto-update.md) — GitHub Releases 自動更新
- [Security Model](./cross-cutting/security-model.md) — injection / path 防御
- [IPC Bridge](./cross-cutting/ipc-bridge.md) — frontend ⇄ backend 境界
- [Startup Perf](./cross-cutting/startup-perf.md) — cold start 体感目標
- [Window Drag](./cross-cutting/window-drag.md) — frameless window drag region
- [Item Lifecycle](./cross-cutting/item-lifecycle.md) — item の生成 / 削除 / 保持 / 孤立 contract matrix (table 主体、 7-section 規範形式の例外)
- [Activity Privilege Separation](./cross-cutting/activity-privilege-separation.md) — 特権収集 (読取専用・no-exec) と非特権 UI/launcher の分離・信頼境界 (V2)

## 使い方

### 新機能 / widget を追加するとき

1. 該当する既存 spec の「やらないこと」を読み、その feature の責務外でないか確認
2. 新規 feature なら spec ファイルを先に書く (特に「やらないこと」「性能予算」)
3. 実装が spec と乖離したら、どちらが正しいか判断して spec か実装を直す

### bug / freeze を調査するとき

1. 症状が出る画面・widget の spec を開き、「やらないこと」「性能予算」と実装を突き合わせる
2. spec の「やらないこと」に書かれた処理を実装がしていれば、それが真因候補
3. 例: Library freeze は [Metadata Service](./backend/metadata-service.md) の「非画像 file のハンドルを開かない」契約違反だった

### AI session の prompt に使うとき

- 作業対象 feature の spec ファイルを prompt に含めると、契約 (やらないこと含む) を踏まえた実装になる
- 画面をまたぐ作業は該当 screen spec + 関連 backend spec をセットで渡す

## 関連

- 画面別の詳細な機能カタログ → [`../screens/`](../screens/)
- 全体アーキテクチャ → [`../foundation.md`](../foundation.md)
- 失敗駆動メモリ → [`../lessons.md`](../lessons.md)
