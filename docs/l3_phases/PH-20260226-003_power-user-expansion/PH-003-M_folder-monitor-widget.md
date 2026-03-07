---
status: done
phase_id: PH-003-M
depends_on:
  - PH-003-K
---

# PH-003-M: フォルダ監視ウィジェット刷新 + 入力補完制御

## 概要

ProjectsWidget をフォルダ監視機能と統合し、監視フォルダの自動追加・起動機能を追加する。
各ウィジェットの設定モーダル、フォルダのデフォルトアプリ選択、テキスト入力の予測候補制御も実装する。
PH-003-K（不要ウィジェット削除）完了後に着手する。

---

## M-1: ウィジェット設定モーダル

### 背景

現在のウィジェットには個別の設定画面がない。MoreMenu に「設定」項目はあるが、モーダルが未実装。各ウィジェットの表示件数・フィルタ条件などを設定できるようにする。

### 受け入れ条件

- [x] WidgetShell の MoreMenu に「設定」メニュー項目がある
- [x] クリックすると設定モーダルが開く
- [x] 各ウィジェットタイプごとに設定内容が異なる:
  - Favorites: 表示件数（デフォルト 10）
  - Recent: 表示件数（デフォルト 10）
  - Projects: 表示件数、Git ステータスポーリング間隔
- [x] 設定は DB の `workspace_widgets.config` カラム（JSON）に保存される
- [x] `pnpm verify` が通過する

### 変更対象ファイル

| ファイル                                                            | 変更内容                          |
| ------------------------------------------------------------------- | --------------------------------- |
| `src/lib/components/arcagate/workspace/WidgetSettingsDialog.svelte` | 新規作成 — 汎用設定モーダル       |
| `src/lib/components/arcagate/common/WidgetShell.svelte`             | 設定メニュー項目 + モーダル表示   |
| `src/lib/components/arcagate/workspace/FavoritesWidget.svelte`      | config から表示件数読み取り       |
| `src/lib/components/arcagate/workspace/RecentLaunchesWidget.svelte` | config から表示件数読み取り       |
| `src/lib/components/arcagate/workspace/ProjectsWidget.svelte`       | config からポーリング間隔読み取り |

---

## M-2: Projects ウィジェット = フォルダ監視統合

### 背景

現在の ProjectsWidget は Git ステータスのみ表示。フィードバックでは「Projects ウィジェット = フォルダ監視ウィジェット」として、監視フォルダの自動検出・アイテム自動追加・起動機能を統合すべきとされている。

### 受け入れ条件

- [x] ProjectsWidget が監視フォルダ（`watched_paths`）の情報も表示する
- [x] 監視フォルダ内の新規ファイル検出時に通知（トースト）を表示する
- [x] 検出されたファイルをワンクリックでアイテムとして登録できる
- [x] Git ステータス表示（ブランチ名、変更ファイル数）は維持
- [x] `pnpm verify` が通過する

### 変更対象ファイル

| ファイル                                                      | 変更内容                                          |
| ------------------------------------------------------------- | ------------------------------------------------- |
| `src/lib/components/arcagate/workspace/ProjectsWidget.svelte` | 監視フォルダ情報の統合表示                        |
| `src/lib/ipc/workspace.ts`                                    | 監視フォルダ関連の IPC 呼び出し追加（必要な場合） |

---

## M-3: フォルダのデフォルトアプリ選択

### 背景

フォルダアイテムを起動する際のデフォルトアプリケーションを選択できるようにする。現在はシステムのデフォルト（Explorer）で開くのみ。

### 受け入れ条件

- [x] フォルダアイテムの詳細パネルまたは設定で「デフォルトアプリ」を選択できる
- [x] 選択肢の例: Explorer、VSCode、Terminal、カスタムパス
- [x] 選択したアプリが DB に保存される（`items` テーブルの拡張 or `config` JSON）
- [x] 起動時に選択されたアプリでフォルダが開かれる
- [x] `pnpm verify` が通過する

### 変更対象ファイル

| ファイル                                                        | 変更内容                                 |
| --------------------------------------------------------------- | ---------------------------------------- |
| `src/lib/components/arcagate/library/LibraryDetailPanel.svelte` | デフォルトアプリ選択 UI 追加             |
| `src-tauri/src/services/launch_service.rs`                      | アプリ指定起動ロジック追加               |
| `src-tauri/src/models/item.rs`                                  | デフォルトアプリ情報の保持（必要な場合） |

---

## M-4: テキスト入力の予測候補を出さない

### 背景

フィードバックで「テキスト入力の予測候補を出さない」とされている。全てのテキスト入力フィールドに `autocomplete="off"` を適用する。

### 受け入れ条件

- [x] 全ての `<input type="text">` に `autocomplete="off"` が設定される
- [x] 検索入力、フォーム入力、インライン編集を含む
- [x] ブラウザの自動補完ポップアップが表示されない
- [x] `pnpm verify` が通過する

### 変更対象ファイル

| ファイル                                                     | 変更内容                              |
| ------------------------------------------------------------ | ------------------------------------- |
| `src/lib/components/item/ItemForm.svelte`                    | 全 input に `autocomplete="off"`      |
| `src/lib/components/arcagate/library/LibraryMainArea.svelte` | 検索 input に `autocomplete="off"`    |
| `src/lib/components/arcagate/palette/PaletteInput.svelte`    | palette input に `autocomplete="off"` |
| その他の input を含むコンポーネント                          | 一括適用                              |

---

## Exit Criteria

- [x] 全ウィジェットに設定モーダルが実装される
- [x] ProjectsWidget がフォルダ監視機能を統合している
- [x] フォルダのデフォルトアプリ選択が動作する
- [x] 全テキスト入力で予測候補が表示されない
- [x] E2E テストが通過する
- [x] `pnpm verify` が全通過
