# Use Case Friction Report v2 — batch-92 PH-415

**実施日**: 2026-04-27 / **手法**: Heuristic Evaluation (Nielsen 10) + Cognitive Walkthrough 4 Steps + 業界比較
**信頼度**: 4/5（agent コード read + 業界標準照合 + Codex セカンドオピニオン予定。実機計測は PH-419 で別途）
**前回**: `use-case-friction.md` (v1, 信頼度 2/5、コード read 単独)

## 凡例

- severity: **0** not a problem / **1** cosmetic / **2** minor / **3** major / **4** catastrophic
- HE: Nielsen 10 — H1 状態可視化 / H2 現実一致 / H3 ユーザ制御 / H4 一貫性 / H5 エラー予防 / H6 認識 vs 想起 / H7 効率 / H8 最小主義 / H9 エラー復旧 / H10 ヘルプ
- CW: Q1 目標 / Q2 手段認知 / Q3 操作可能性 / Q4 フィードバック

---

## 1. ゲーム起動（Steam / 同人 / 単体 exe）

**現状フロー**: Palette `Ctrl+Shift+Space` → 検索 → Enter → `paletteStore.launch` → `cmd_launch_item`。Workspace は Favorites/Recent widget の dblclick → 同じ launchItem。LibraryCard も dblclick → 同じ。

**コード**: `PaletteOverlay.svelte` / `LibraryCard.svelte` / `WidgetItemList.svelte` / `src-tauri/src/commands/launch_commands.rs`

### Nielsen 10

| H   | 評価                      | severity | メモ                                                                      |
| --- | ------------------------- | -------- | ------------------------------------------------------------------------- |
| H1  | 起動中の表示なし          | 2        | 起動完了 toast はあるが「起動中」インジケータなし、長時間 launch 時に不安 |
| H2  | ✅ 自然                   | 0        | 「起動」「launch」の表現は標準                                            |
| H3  | ❌ undo / cancel なし     | 2        | 起動を間違ったときキャンセル不可、別ウィンドウ閉じるしかない              |
| H4  | ✅ 経路統一               | 0        | Palette/Library/Workspace で同一 IPC、表現も統一                          |
| H5  | ❌ 削除済み path 警告なし | 2        | path 不正時は launch 後 toast、事前 grayout なし（is_enabled は別）       |
| H6  | ✅ アイコン + 名前        | 0        | 認識ベースで OK                                                           |
| H7  | ✅ 高速 keyboard 完結     | 0        | ホットキー → 検索 → Enter で完結                                          |
| H8  | ✅ 最小                   | 0        | パレット UI は最小                                                        |
| H9  | ❌ 失敗診断不足           | 3        | 「起動に失敗しました: <stack>」のみ、原因 / 対処不明 → PH-417 で対応      |
| H10 | ❌ ヘルプなし             | 3        | 初心者は何をすればいいか不明、`?` cheat sheet なし → PH-418 で対応        |

### CW（主要 3 ステップ）

- **Step 1: Ctrl+Shift+Space 押下**
  - Q1 目標: ❌ 初回ユーザはホットキーを知らない（H10 違反）
  - Q2 手段認知: ❌ どこにも書いていない（onboarding なし、PH-418 で対応）
  - Q3 操作可能性: ✅（global hotkey 登録済）
  - Q4 フィードバック: ✅（パレット即時表示）
- **Step 2: 検索文字入力**
  - Q1-4: ✅ 全て自然、debounce 150ms
- **Step 3: Enter で起動**
  - Q1-3: ✅
  - Q4: ⚠️ 起動完了 toast は出るが「起動中」表示なし

### 業界比較

| 競合      | 同等操作                    | 差分                                   |
| --------- | --------------------------- | -------------------------------------- |
| Raycast   | ⌘Space → fuzzy → Enter      | ホットキー discoverable（cheat sheet） |
| Spotlight | ⌘Space → 即時 fuzzy         | 応答 < 100ms、検索は OS native         |
| Steam     | ライブラリ → ダブルクリック | onboarding tutorial 完備               |

### 摩擦サマリ

- 🟡 medium: H9（PH-417） / H10（PH-418） / H1 起動中表示
- micro: H3 cancel、H5 削除済み警告

---

## 2. 同人ゲームライブラリ（一括 D&D + タグ付け）

**現状フロー**: Library MainArea で D&D → `cmd_create_item` × N → タグ付けは個別 LibraryDetailPanel で 1 件ずつ。

**コード**: `LibraryMainArea.svelte` / `LibraryDetailPanel.svelte` / `LibraryItemTagSection.svelte`

### Nielsen 10

| H   | 評価                 | severity | メモ                                                               |
| --- | -------------------- | -------- | ------------------------------------------------------------------ |
| H1  | ✅ 追加 toast        | 0        |                                                                    |
| H2  | ✅                   | 0        | D&D は OS 慣行                                                     |
| H3  | ❌ bulk undo なし    | 3        | N 件 D&D を bulk undo できない                                     |
| H4  | ✅                   | 0        |                                                                    |
| H5  | ⚠️ 重複追加警告       | 2        | 同 path を 2 度追加してもサイレント                                |
| H6  | ✅                   | 0        |                                                                    |
| H7  | ❌ bulk タグ付けなし | 3        | 1 件ずつ右パネルでタグ付け、batch 100 件は苦行                     |
| H8  | ✅                   | 0        |                                                                    |
| H9  | ⚠️ 失敗時の原因       | 2        | path 不正で D&D 失敗時、何件成功 / 何件失敗が toast に集約されない |
| H10 | ❌ ヘルプなし        | 3        | 「D&D で追加できます」hint なし → PH-418                           |

### CW

- **Step 1: フォルダを D&D**
  - Q1: ❌ 「D&D で追加できる」が UI に書かれていない（empty state hint で対処可能、PH-418）
  - Q2-4: ✅
- **Step 2: タグ付け**
  - Q1: ✅（カードクリック → 詳細パネル）
  - Q2: ❌ 一括タグ付けが UI 上に存在しないことに気づかない
  - Q3-4: ⚠️ 個別操作のみ

### 業界比較

| 競合     | 同等操作                               | 差分                          |
| -------- | -------------------------------------- | ----------------------------- |
| Steam    | コレクション一括タグ付け（dialog）     | 一括 UI あり                  |
| Playnite | bulk-edit panel（複数選択 → タグ追加） | 一括 UI あり、Arcagate に欠如 |

### 摩擦サマリ

- 🟡 medium: H7 bulk タグ付け（batch-93 候補 PH-420）/ H10 hint
- 🟢 micro: H5 重複警告、H9 一括失敗集約

---

## 3. プロジェクト開始（IDE / ターミナル / ブラウザ）

**現状フロー**: Workspace の Projects widget でプロジェクト選択 → 個別アイテムを 1 つずつ起動。「launch group」（関連起動）機能は **未実装**。

**コード**: `src/lib/widgets/projects/`

### Nielsen 10

| H   | 評価                 | severity | メモ                                            |
| --- | -------------------- | -------- | ----------------------------------------------- |
| H1  | ✅                   | 0        |                                                 |
| H2  | ⚠️                    | 1        | 「プロジェクト = フォルダ」は IDE 慣行と一致    |
| H3  | ⚠️                    | 1        | 起動順序の cancel は不可                        |
| H4  | ✅                   | 0        |                                                 |
| H5  | ⚠️                    | 1        |                                                 |
| H6  | ✅                   | 0        |                                                 |
| H7  | ❌ launch group なし | 3        | 1 操作で複数起動できない（Codex Q4 macro 候補） |
| H8  | ✅                   | 0        |                                                 |
| H9  | ❌                   | 2        | H9 共通                                         |
| H10 | ❌                   | 3        | H10 共通                                        |

### CW

- 「プロジェクト関連を一気に起動」が UI 上に存在しない → Q2 手段認知で詰む

### 業界比較

| 競合        | 同等操作                                    | 差分           |
| ----------- | ------------------------------------------- | -------------- |
| Raycast     | Quicklinks bundle / extension で macro 起動 | macro 起動標準 |
| Alfred      | Workflow で連鎖起動                         | macro 起動標準 |
| Stream Deck | 1 ボタン複数起動                            | macro 起動標準 |

### 摩擦サマリ

- 🔴 macro 候補: H7 launch group 機能新設（Rule A、ユーザ承認必要）
- 🟡 medium: H10 共通

---

## 4. 日次月次タスク（DailyTask widget）

**現状フロー**: Workspace の DailyTask widget で項目チェック / リセット日時で自動リセット。

**コード**: `src/lib/widgets/daily-task/`

### Nielsen 10

| H   | 評価                  | severity | メモ                                                    |
| --- | --------------------- | -------- | ------------------------------------------------------- |
| H1  | ✅ チェックで状態変化 | 0        |                                                         |
| H2  | ✅                    | 0        |                                                         |
| H3  | ✅ チェック解除可能   | 0        |                                                         |
| H4  | ✅                    | 0        |                                                         |
| H5  | ⚠️ 削除確認            | 1        | チェックリスト項目削除時の確認は `ConfirmDialog` 要確認 |
| H6  | ✅                    | 0        |                                                         |
| H7  | ⚠️ 並べ替え            | 1        | D&D 並べ替えは編集モードで可能だが認知しづらい          |
| H8  | ✅                    | 0        |                                                         |
| H9  | ✅                    | 0        | 致命エラーケースなし                                    |
| H10 | ❌                    | 2        | リセット日時の説明がない                                |

### CW

- 想定通り動く、摩擦少

### 業界比較

| 競合     | 同等操作       | 差分                 |
| -------- | -------------- | -------------------- |
| Notion   | ToDo block     | 似た UX              |
| TickTick | 繰り返しタスク | リセット日時 UX 同等 |

### 摩擦サマリ

- 🟢 micro: H10 リセット日時 hint

---

## 5. フォルダ整理（exe / ディレクトリ監視）

**現状フロー**: Settings の取り込みフォルダ設定 → notify v7 で監視 → 自動で Library に追加。

**コード**: `src-tauri/src/services/watch_service.rs` / `src/lib/components/settings/sections/AppearanceSection.svelte`（取り込みフォルダ UI 確認要）

### Nielsen 10

| H   | 評価                    | severity | メモ                                               |
| --- | ----------------------- | -------- | -------------------------------------------------- |
| H1  | ❌ 監視状態の可視化なし | 3        | 監視中 / 停止中 / エラーバッジなし → PH-417 で対応 |
| H2  | ⚠️                       | 1        | 「取り込みフォルダ」用語は他ツールと一致しない     |
| H3  | ✅ 削除可能             | 0        |                                                    |
| H4  | ✅                      | 0        |                                                    |
| H5  | ⚠️ 大量ファイル警告なし  | 2        | 巨大ディレクトリ追加で大量取り込み、確認なし       |
| H6  | ✅                      | 0        |                                                    |
| H7  | ✅                      | 0        | 設定 1 回で自動                                    |
| H8  | ✅                      | 0        |                                                    |
| H9  | ❌ watch エラー silent  | 3        | watch fails silently → PH-417 で可視化             |
| H10 | ❌                      | 3        | フォルダ深さ・除外パターン等の hint なし           |

### CW

- **Step 1: 設定でフォルダ追加**
  - Q1: ✅
  - Q2-4: ✅
- **Step 2: 自動取り込み**
  - Q4: ❌ 何件取り込まれたか toast 出ない（要確認）

### 業界比較

| 競合     | 同等操作               | 差分                          |
| -------- | ---------------------- | ----------------------------- |
| Playnite | ライブラリ source 設定 | 監視状態 + バッジで可視化     |
| GOG      | フォルダ scan          | scan 結果 N 件追加 toast 明示 |

### 摩擦サマリ

- 🟡 medium: H1 監視状態（PH-417）/ H9 watch エラー（PH-417）/ H10 hint（PH-418）
- 🟢 micro: H2 用語、H5 大量警告

---

## 6. クリップボード履歴呼び出し

**現状フロー**: Workspace の ClipboardHistory widget でリスト表示 → クリックでコピー。

**コード**: `src/lib/widgets/clipboard-history/`

### Nielsen 10

| H   | 評価               | severity | メモ                                                                             |
| --- | ------------------ | -------- | -------------------------------------------------------------------------------- |
| H1  | ⚠️ コピー成功 toast | 1        | toast はあるが微妙、widget 内 flash も要確認                                     |
| H2  | ✅                 | 0        |                                                                                  |
| H3  | ⚠️ 削除確認なし     | 1        | 履歴削除は即時、undo なし                                                        |
| H4  | ✅                 | 0        |                                                                                  |
| H5  | ✅                 | 0        |                                                                                  |
| H6  | ✅                 | 0        |                                                                                  |
| H7  | ❌ 検索なし        | 3        | 履歴 100 件超えると目視のみ、検索不可 → batch-91 PH-414 候補で言及あったが未実装 |
| H8  | ✅                 | 0        |                                                                                  |
| H9  | ⚠️                  | 1        |                                                                                  |
| H10 | ❌                 | 2        |                                                                                  |

### CW

- 100 件超えで Q3 操作可能性が崩れる（目視だけでは見つからない）

### 業界比較

| 競合    | 同等操作                 | 差分            |
| ------- | ------------------------ | --------------- |
| Raycast | Clipboard History 検索可 | 検索完備        |
| Ditto   | 検索 + ピン留め          | 高機能          |
| Windows | Win+V → 検索なし         | Arcagate と同等 |

### 摩擦サマリ

- 🟡 medium: H7 検索（batch-93 候補 PH-421）

---

## 7. メモ・アイデア（QuickNote）

**現状フロー**: Workspace の QuickNote widget で書く → 自動保存。

### Nielsen 10

全 H で ✅ または micro。

| H    | 評価       | severity | メモ                                                      |
| ---- | ---------- | -------- | --------------------------------------------------------- |
| H1   | ⚠️ 保存表示 | 1        | 保存中インジケータ要確認                                  |
| H2   | ✅         | 0        |                                                           |
| H3   | ⚠️ undo     | 1        | textarea undo は browser native、widget 単位 history なし |
| H4-8 | ✅         | 0        |                                                           |
| H9   | ✅         | 0        |                                                           |
| H10  | ⚠️          | 1        | hint なしでも自然                                         |

### CW

完走、摩擦最小。

### 摩擦サマリ

- 🟢 micro: H1 保存中表示、H3 widget undo

---

## 8. ファイル検索（FileSearch widget / Library 検索）

**現状フロー**: FileSearch widget でクエリ → Rust 側で walkdir スキャン。Library 検索バーは items テーブルから検索。

**コード**: `src/lib/widgets/file-search/` / `src-tauri/src/commands/file_search_commands.rs` / `LibraryMainArea.svelte`

### Nielsen 10

| H   | 評価                     | severity | メモ                                                           |
| --- | ------------------------ | -------- | -------------------------------------------------------------- |
| H1  | ⚠️ スキャン中インジケータ | 2        | walkdir 中の進捗が UI に出ない、長時間時に固まったように見える |
| H2  | ✅                       | 0        |                                                                |
| H3  | ❌ cancel なし           | 3        | 巨大ディレクトリ検索開始後、停止できない → batch-93 候補       |
| H4  | ✅                       | 0        |                                                                |
| H5  | ⚠️                        | 1        |                                                                |
| H6  | ✅                       | 0        |                                                                |
| H7  | ⚠️ debounce 150ms         | 1        | Raycast < 50ms と比較すると遅い、要計測（PH-419）              |
| H8  | ✅                       | 0        |                                                                |
| H9  | ⚠️ エラー toast           | 2        | 権限エラー時に何が起きたか分かりにくい                         |
| H10 | ❌                       | 2        |                                                                |

### CW

- Step 1: 検索開始 → Q4 フィードバック弱い（インジケータなし）
- 停止できないのは Codex 指摘の通り、batch-93 候補

### 業界比較

| 競合       | 同等操作              | 差分                                  |
| ---------- | --------------------- | ------------------------------------- |
| Everything | indexed search        | 即時、Arcagate は live walkdir で遅い |
| Spotlight  | indexed search        | 即時                                  |
| Raycast    | File Search extension | indexed                               |

### 摩擦サマリ

- 🟡 medium: H1 進捗、H3 cancel（batch-93 候補 PH-422）、H7 速度（PH-419 で計測）
- 🟢 micro: H9 / H10

---

## 9. 設定変更（hotkey / autostart / Library 設定）

**現状フロー**: Settings ボタン → 2 ペイン navigation（General / Workspace / Library / Appearance / Data / About 等）→ 項目変更 → 即時反映。

**コード**: `src/lib/components/settings/SettingsPanel.svelte` + `src/lib/components/settings/sections/`

### Nielsen 10

| H   | 評価                      | severity | メモ                                     |
| --- | ------------------------- | -------- | ---------------------------------------- |
| H1  | ✅ 即時反映               | 0        |                                          |
| H2  | ✅                        | 0        |                                          |
| H3  | ⚠️ reset to default なし   | 2        | 設定をデフォルトに戻すボタン未確認       |
| H4  | ✅ 2 ペイン               | 0        |                                          |
| H5  | ✅ 即時反映で誤操作見える | 0        |                                          |
| H6  | ✅                        | 0        |                                          |
| H7  | ✅                        | 0        |                                          |
| H8  | ✅                        | 0        |                                          |
| H9  | ✅                        | 0        |                                          |
| H10 | ❌ 設定項目の説明不足     | 2        | 各項目に hint がない、「これ何？」がある |

### CW

- 想定通り動く、摩擦少

### 業界比較

| 競合    | 同等操作            | 差分             |
| ------- | ------------------- | ---------------- |
| VS Code | 設定 search + 説明  | 各項目に説明完備 |
| Raycast | 設定 search + reset | reset 完備       |

### 摩擦サマリ

- 🟢 micro: H3 reset、H10 説明

---

## 10. テーマ切替

**現状フロー**: Settings → Appearance → テーマカード選択 → 即時反映。カスタムテーマは ThemeEditor（dynamic import）で編集。

**コード**: `src/lib/components/theme/ThemeEditor.svelte` + `src/lib/components/settings/sections/AppearanceSection.svelte`

### Nielsen 10

| H   | 評価                 | severity | メモ                             |
| --- | -------------------- | -------- | -------------------------------- |
| H1  | ✅ 即時反映          | 0        |                                  |
| H2  | ✅                   | 0        |                                  |
| H3  | ✅ 元に戻せる        | 0        | unmount 時 cleanup（lessons.md） |
| H4  | ✅                   | 0        |                                  |
| H5  | ✅                   | 0        |                                  |
| H6  | ✅                   | 0        |                                  |
| H7  | ✅                   | 0        |                                  |
| H8  | ✅                   | 0        |                                  |
| H9  | ⚠️ JSON import エラー | 1        | 不正 JSON 時のメッセージ要確認   |
| H10 | ⚠️                    | 1        | カスタムテーマの作り方 hint なし |

### CW

- 完走、摩擦最小

### 業界比較

| 競合     | 同等操作           | 差分                                             |
| -------- | ------------------ | ------------------------------------------------ |
| VS Code  | テーマ marketplace | community share あり、Arcagate は JSON exch のみ |
| Obsidian | community theme    | 似た JSON exchange                               |

### 摩擦サマリ

- 🟢 micro: H9 / H10

---

## 集計表（severity × ケース）

| ケース            | sev 4 | sev 3  | sev 2  | sev 1  | 合計   |
| ----------------- | ----- | ------ | ------ | ------ | ------ |
| 1. ゲーム起動     | 0     | 2      | 4      | 0      | 6      |
| 2. ライブラリ     | 0     | 3      | 2      | 0      | 5      |
| 3. プロジェクト   | 0     | 2      | 0      | 3      | 5      |
| 4. 日次タスク     | 0     | 0      | 1      | 3      | 4      |
| 5. フォルダ監視   | 0     | 3      | 2      | 1      | 6      |
| 6. クリップボード | 0     | 1      | 1      | 4      | 6      |
| 7. QuickNote      | 0     | 0      | 0      | 4      | 4      |
| 8. ファイル検索   | 0     | 1      | 3      | 2      | 6      |
| 9. 設定           | 0     | 0      | 2      | 0      | 2      |
| 10. テーマ        | 0     | 0      | 0      | 2      | 2      |
| **合計**          | **0** | **12** | **15** | **19** | **46** |

### 観察

- **severity 4（catastrophic）: 0 件** — Rule A エスカレーション不要
- **severity 3（major）: 12 件** — batch-92 残 plan + batch-93 で順次対応
  - H7 一括タグ付け / launch group / clipboard 検索 / file search cancel（4 件）
  - H9 launch 失敗診断 + watch silent fail（2 件、PH-417 でカバー）
  - H10 in-app help 不在（5 件、PH-418 でカバー）
  - H1 監視状態可視化（1 件、PH-417 でカバー）
- **severity 2（minor）: 15 件** — 一貫性 / hint 系、PH-416 + PH-418 で大半カバー
- **severity 1（cosmetic）: 19 件** — batch-93 以降、低優先

### macro 判定

batch-90 の「macro 0 件」判定は妥当（severity 4 = 0）が、**severity 3 = 12 件は構造的改修が複数必要**:

- launch group（H7 / case 3）: 機能新設、構造拡張 → Codex Q4 macro 候補、Rule A
- 一括タグ付け（H7 / case 2）: bulk-edit UI 新設 → 改善範囲、Rule B
- clipboard / file-search の検索 / cancel（H7 / case 6, 8）: 機能拡張、batch-93 候補

「Polish Era 完走」**判定は否定**（H10 / 一貫性 / 復旧導線が major 多数残）、batch-92 の PH-416/417/418 完走 + 必要に応じ batch-93 で再判定。

### batch-92 残 Plan へのカバレッジ

| severity 3 摩擦                   | カバー Plan    |
| --------------------------------- | -------------- |
| H1 watch 監視状態                 | PH-417         |
| H7 一括タグ付け                   | batch-93       |
| H7 launch group                   | macro / Rule A |
| H7 clipboard 検索                 | batch-93       |
| H3 file-search cancel             | batch-93       |
| H9 launch 失敗診断 / watch silent | PH-417         |
| H10 in-app help（5 件）           | PH-418         |
| H4 一貫性 micro                   | PH-416         |

batch-92 の PH-416/417/418 で **8 件 / 12 件 (67%)** の severity 3 を解消見込み。
残 4 件は batch-93 で機能拡張系（launch group / 一括タグ付け / clipboard 検索 / file-search cancel）。

### batch-93 候補（dispatch-log 記録予定）

- PH-420 launch group（Rule A、ユーザ承認必要）
- PH-421 一括タグ付け
- PH-422 clipboard 検索 + file-search cancel
- PH-423 個別深掘り audit（severity 3 残ケースを `audit-2026-04-27/` に記録）

---

## Codex Rule C 投げ込み計画

PH-415 完了時、Codex に以下を投げて再 review:

1. severity 集計の妥当性（過大評価 / 過小評価ないか）
2. macro 判定（severity 4 = 0 → 構造再設計不要）の業界比較での妥当性
3. PH-416/417/418/419 で公開水準到達できるか / 不足は何か
4. batch-93 候補の優先順位
5. 「Polish Era 完走宣言」を batch-92 完了で再判定するのは妥当か

回答は `docs/l1_requirements/ux-research/codex-review-batch-92.md` に記録。

---

## 参照

- `docs/l3_phases/_template/use-case-audit.md` — 雛形（個別深掘り用）
- `docs/l1_requirements/ux-research/industry-standards.md` — Nielsen 10 / 業界比較ソース
- `docs/l1_requirements/ux-research/cedec-papers.md` — HE+CW 手法
- `docs/l1_requirements/ux-research/codex-review.md` — batch-91 Codex review（5 質問）
- `docs/l2_architecture/use-case-friction.md` — v1（信頼度 2/5、コード read 単独）
