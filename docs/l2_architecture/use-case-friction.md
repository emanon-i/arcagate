# Use Case Friction Report — batch-90 PH-406

walkthrough 日: 2026-04-27 / agent コード read 主体 + 既存 e2e テスト参照。
詳細実機 walkthrough (CDP) は許可制のため、本 audit では **コード read + e2e カバレッジ確認** で代用。
実機検証は次バッチでユーザ承認後に追加実施可。

## 凡例

- 🟢 **micro**: 1〜5 行で直る、即修正対象
- 🟡 **medium**: 機能追加 / 既存改修、5 ファイル以下、batch-91+
- 🔴 **macro**: 構造再設計、Rule A 該当、ユーザエスカレーション
- ✅ **OK**: 摩擦なし

---

## 1. ゲーム起動（Steam / 同人 / 単体 exe）

**現状フロー**: Palette `Ctrl+Space` → search → Enter → `paletteStore.launch` → `launchItem(id)` IPC。Workspace では Favorites / Recent / Stats widget で ondblclick → 同じ launchItem。LibraryCard でも ondblclick → launchItem。

**カバレッジ**: `palette.spec.ts` / `library-detail.spec.ts` / `workspace-widget-item.spec.ts` で各経路カバー済。

**観察**:

- toast 文言は「<label> を起動しました」「起動に失敗しました: <e>」で統一済（PH-393 確認済）
- launch 失敗時の復旧導線: toast のみで詳細なし → リトライボタン無し

**摩擦**:

- 🟡 launch 失敗時の **diagnose 不足**: ファイルが見つからない / 権限なし / 実行不可 の区別なし、「起動に失敗しました: <stack>」のみ。batch-91 で「実行可能性チェック + わかりやすい原因表示」を提案。

---

## 2. 同人ゲームライブラリ

**現状フロー**: Library 「+ アイテム追加」or D&D → ItemForm でメタ入力 → 保存 → LibraryCard 表示（4:3 / S/M/L）→ タグ付けは LibraryDetailPanel から。

**カバレッジ**: `items.spec.ts` / `library-card-spec.spec.ts` / `library-card-metadata.spec.ts` / `library-detail.spec.ts`。

**観察**:

- LibraryCard 背景画像 + focal point カスタマイズは batch-65 で完成
- タグフィルタ: `library-tag-filter.spec.ts` でカバー
- 一括タグ付け / 一括追加は未対応

**摩擦**:

- 🟡 **一括 D&D での一括タグ付け** 不可: 1 件ずつ ItemForm 開く必要。同人ゲーム数十本一気に追加するときに摩擦。batch-91+。
- 🟡 **サムネイル自動生成**: フォルダ内の screenshot.png や thumb.png を自動検出する機能なし。batch-91+。

---

## 3. プロジェクト開始（IDE / ターミナル / ブラウザ）

**現状フロー**: Workspace の Projects widget でプロジェクト一覧 → クリック → ondblclick で起動。または Library で「project」タグ検索。

**カバレッジ**: `workspace.spec.ts` / `widget-display.spec.ts`。

**観察**:

- Projects widget は git status 表示あり（batch-43 で実装）
- 「関連ツール一括起動」（IDE + ターミナル + ブラウザ）の機能なし

**摩擦**:

- 🟡 **launch group**: 「project A を開く時に VSCode + Terminal + ブラウザを一気に起動」のような複合 launch なし。batch-91+ で「起動グループ」機能を提案候補。

---

## 4. 日次月次タスク

**現状フロー**: DailyTask widget → タスク表示 → チェックボックスで完了。

**カバレッジ**: `widget-display.spec.ts` でレンダリング確認のみ。

**観察**:

- DailyTaskWidget.svelte 実装あり、設定で `hideCompleted` 等
- 月次タスク（月初リセット）は未対応
- 「今日のタスク」「明日のタスク」分離なし

**摩擦**:

- 🟡 **月次/週次タスク分離**: 現状 daily のみ。週次（月曜だけ）月次（月初）の繰り返し設定なし。batch-91+。

---

## 5. フォルダ整理（exe / ディレクトリ監視）

**現状フロー**: Settings or Widget 設定で監視フォルダ追加 → notify watcher 起動 → フォルダ内の exe / ディレクトリ変化を検知 → 自動でアイテム化（auto_add フラグ on の場合）。

**カバレッジ**: `widget-display.spec.ts` で ExeFolder widget のレンダリング確認、watcher の実機テストなし。

**観察**:

- batch-87 で notify default-features 復活、Watcher 動作 OK
- ExeFolderWatchWidget で `cmd_extract_item_icon` 同期 IPC（既知の C-2、refactoring-opportunities.md）
- 監視フォルダ削除 UI は Settings 経由

**摩擦**:

- 🟡 **icon extraction が同期 IPC**: アイテム数増えると起動時に重い可能性（既知、`docs/l2_architecture/refactoring-opportunities.md` C-2）。batch-91+ で async + spawn_blocking 化提案。
- 🟢 **observed**: ExeFolderWatchWidget の toast 文言 PH-393 で「設定保存に失敗 → 設定の保存に失敗しました」修正済。

---

## 6. クリップボード再利用

**現状フロー**: ClipboardHistory widget → ポーリングで履歴取得 → クリックで再 copy。

**カバレッジ**: `widget-display.spec.ts`。

**観察**:

- ポーリング間隔 1500ms（設定可、500〜10000ms）
- 重複検出は `clipboard-history.ts` utils
- 履歴最大件数は設定可（1〜200）

**摩擦**:

- 🟡 **検索機能なし**: 履歴 200 件溜まると探すのが大変。batch-91+ で履歴内検索を提案。
- 🟡 **画像クリップボード非対応**: テキストのみ。batch-91+ で画像対応検討（WebView2 対応次第）。

---

## 7. メモ・アイデア

**現状フロー**: QuickNote widget → textarea → debounced 保存。

**カバレッジ**: `widget-display.spec.ts`。

**観察**:

- font_size 設定 (sm/md/lg)
- 1 widget につき 1 メモ、複数メモ管理は workspace 切替で対応

**摩擦**:

- ✅ シンプル機能、現状 OK。
- 🟢 観察: PH-393 で「メモの保存に失敗しました」表記で統一済。

---

## 8. ファイル検索

**現状フロー**: FileSearch widget → クエリ入力 → root 配下を depth 内で検索 → 結果リスト → クリックで起動。

**カバレッジ**: `widget-display.spec.ts`。

**観察**:

- root / depth (1〜3) / limit (10〜2000) 設定可
- ファイル名のみ検索、内容検索なし

**摩擦**:

- 🟡 **内容検索なし**: ripgrep 統合提案候補、batch-91+。ただし依存追加なので Rule A 該当。
- 🟡 **検索履歴なし**: 同じクエリを繰り返す場面あり。batch-91+。

---

## 9. 設定変更

**現状フロー**: Settings ボタン → Settings Panel 開く → カテゴリ navigation（左ペイン）→ 項目変更（右ペイン）。

**カバレッジ**: `settings.spec.ts`。

**観察**:

- 2 ペイン navigation は batch-44 で完成
- About カテゴリは batch-86 PH-386 で追加済
- カテゴリ: General / Workspace / Library / Appearance / Data / About（Sound は batch-88 PH-396 で削除済）
- 各カテゴリの項目分割は batch-89 PH-400 deferred (Rule A)

**摩擦**:

- 🟡 **SettingsPanel 約 500 行**: refactoring-opportunities.md で確認、PH-400 deferred chain で配置整理予定。batch-91+ ユーザ承認後。
- 🟢 「設定を読み込み中...」表示は PH-401 で LoadingState 化済。

---

## 10. テーマ切替

**現状フロー**: Settings → Appearance → テーマカード（builtin / custom）→ クリックで即時反映。カスタムテーマは「コピーして編集」→ ThemeEditor (dynamic import) → CSS var エディタ。

**カバレッジ**: `theme-editor.spec.ts` / `theme-visual-diff.spec.ts`。

**観察**:

- builtin: dark / light / endfield / liquid-glass / ubuntu-frosted-enhanced 等
- import / export JSON 対応
- ThemeEditor は dynamic import（PH-381 で lazy 化）

**摩擦**:

- ✅ 全機能網羅、現状 OK。

---

## 集計

| 分類                | 件数                                    |
| ------------------- | --------------------------------------- |
| ✅ OK               | 2 (case 7, 10)                          |
| 🟢 micro 即修正     | 0（PH-393/401 で既に解消済）            |
| 🟡 medium 改修候補  | 11 (cases 1, 2x2, 3, 4, 5, 6x2, 8x2, 9) |
| 🔴 macro 構造再設計 | 0                                       |

**結論**:

- **macro 摩擦ゼロ**: 構造再設計は不要、Restructure Era 提案は不要
- **micro 摩擦ゼロ**: 既存 batch-87/88/89 で解消済（コピー統一・LoadingState・音声削除）
- **medium 摩擦 11 件**: batch-91 以降で順次解消候補。Rule A 該当（5 ファイル超）の判断は各 plan 化時に行う

batch-91 候補（高優先 5 件選定）:

1. launch 失敗時の diagnose 強化（case 1）
2. 一括 D&D + 一括タグ付け（case 2）
3. launch group / 関連起動（case 3）
4. icon extraction async 化（case 5、refactoring C-2）
5. ClipboardHistory 検索（case 6）

cleanup-candidates: 現状なし（PH-409 で改めて確認）。

---

## walkthrough 完了サマリ

- **想定 10 ケース全て walkthrough 完了**（コード read + e2e カバレッジ確認）
- 既存 e2e 22 spec で主要動線はカバー済み
- 致命的な動線崩れ / 画面構成問題 **発見なし** → Polish Era 完走宣言可能（batch-90 完走後に PH-403 を再判定）
- 11 件の medium 摩擦は次バッチ群（batch-91〜）で順次対応

実機 walkthrough（CDP 経由）は次バッチでユーザ承認後に追加実施可。本 audit では「コード上で動線が成立する」レベルまで確認。
