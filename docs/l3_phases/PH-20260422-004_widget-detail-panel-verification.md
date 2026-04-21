---
status: todo
phase_id: PH-20260422-004
title: ウィジェット右クリック詳細パネルの一貫性検証と修正
depends_on:
  - PH-20260422-001
  - PH-20260422-002
scope_files:
  - src/lib/components/arcagate/workspace/WorkspaceLayout.svelte
  - src/lib/components/arcagate/library/LibraryDetailPanel.svelte
parallel_safe: false
---

# PH-20260422-004: ウィジェット詳細パネル一貫性

## 目的

PH-20260311-002 の S-6-6（ウィジェット内アイテムを右クリック → Library と同一の
詳細パネル表示）の実機検証。Library 側の詳細パネルを基準形として、Favorites /
Recent Launches / Projects ウィジェットから開いたパネルが視覚・機能とも一致するか確認。

`parallel_safe: false` の理由: PH-20260422-002 と同じ `WorkspaceLayout.svelte` を触るため、
002 の完了を待ってから着手する。

## 参照ドキュメント

- UI/UX 原則: `docs/desktop_ui_ux_agent_rules.md` §5 一貫性、§4 理解可能性
- lessons.md: shadcn / AG トークン二重管理の既知課題（この Plan では解消しない。発見時は要判断として停止）

## 実装ステップ

### Step 1: 基準スクショ取得（Library 詳細パネル）

1. `pnpm tauri dev` 起動
2. Library タブ → 任意アイテムをクリック → 詳細パネル表示
3. スクショ: `tmp/screenshots/PH-20260422-004/01-library-baseline.png`
4. パネルの主要要素をメモ（テキスト色・背景色・ボタン位置・padding・閉じ方）

### Step 2: ウィジェット右クリックの実機検査

1. Workspace タブ → Favorites / Recent Launches / Projects の各ウィジェットを配置
2. 各ウィジェット内の任意アイテムを右クリック
3. 各スクショ: `02-favorites.png`, `03-recent.png`, `04-projects.png`
4. 比較ビュー: 各ウィジェットのスクショを `01-library-baseline.png` と並べて視覚比較
   （可能なら `tmp/screenshots/PH-20260422-004/diff-*.png` として差分画像）

### Step 3: 判定と分類

各ウィジェットのパネルに対して以下の項目で合否判定:

| 項目         | 期待                                           |
| ------------ | ---------------------------------------------- |
| パネル表示   | 右クリックで Library と同じ DetailPanel が開く |
| レイアウト   | セクション順序・padding・border が一致         |
| 色・フォント | Library と同一（トークン由来）                 |
| 操作機能     | 削除・編集・タグ付与・実行が機能               |
| 閉じ方       | Esc または ボタンで閉じる（lessons.md ルール） |

不一致項目を `tmp/screenshots/PH-20260422-004/findings.md` にリストアップ。

### Step 4: 修正

**修正対象として妥当な例**:

- クラス付与漏れ（`text-[var(--ag-text-primary)]` が無い、など）
- プロパティ伝播忘れ（DetailPanel に渡す item prop が null 扱いで一部機能が落ちる）
- Esc キーハンドラの未実装

**修正対象外（このフェーズでは触らない）**:

- shadcn トークン（`--background`, `--destructive` 等）と AG トークンの統合
  → 判明したら `docs/dispatch-log.md` に記録し、新規 Plan 候補として残す
- DetailPanel 全体の再設計

1 変更 1 commit、メッセージは `fix(PH-20260422-004): <要約>`。
トークン統合が必要だと判断したら**即停止**し、ログに記録してディスパッチ終了。

### Step 5: 完了処理

1. frontmatter `status: wip` → `done`
2. 最終コミット → PR → CI → merge → archive 移動

## 受け入れ条件

- [ ] Favorites / Recent Launches / Projects 全てで右クリックが詳細パネルを開く
- [ ] 3 ウィジェットのパネルと Library パネルが視覚的に一致（同一トークンで描画）
- [ ] 削除・編集・タグ付与・実行ボタンが 3 ウィジェットから正常動作
- [ ] Esc および 閉じるボタンでパネルが閉じる
- [ ] `tmp/screenshots/PH-20260422-004/` に比較スクショが揃っている
- [ ] `pnpm verify` 通過

## 禁止事項

- `src/lib/components/ui/` 手動編集禁止
- トークン体系の統合リファクタ禁止（別 Plan 対象）
- DetailPanel の全面書き直し禁止（差分修正のみ）
- 新規ダイアログ・モーダルの追加禁止（既存の再利用のみ）

## 停止条件

- 不一致が shadcn / AG トークン混在に起因すると判明した → 停止してログ記録
- 3 ウィジェットで共通の大規模構造変更が必要と判明 → 停止して判断待ち
