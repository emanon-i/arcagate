---
status: todo
phase_id: PH-20260422-003
title: 監視フォルダ自動登録フローの実機検証と修正
depends_on:
  - PH-20260422-001
scope_files:
  - src-tauri/src/services/fs_watcher.rs
  - src-tauri/src/repositories/watched_path_repository.rs
  - src-tauri/src/repositories/item_repository.rs
  - src/lib/components/arcagate/workspace/ProjectsWidget.svelte
  - src/lib/components/settings/SettingsPanel.svelte
parallel_safe: true
---

# PH-20260422-003: 監視フォルダ自動登録実機検証

## 目的

PH-20260311-002 の S-8-3（監視フォルダに追加された新規サブディレクトリを Library に
自動登録）の E2E 動作を実機で確認。イベント捕捉・重複回避・OFF 時の停止の 3 要素を検査。

## 参照ドキュメント

- UI/UX 原則: `docs/desktop_ui_ux_agent_rules.md` §5 状態可視性
- lessons.md: watcher エラーは `let _` で握り潰さないルール
- CLAUDE.md: ORM 禁止（生 SQL 維持）

## 実装ステップ

### Step 1: テスト環境準備

1. `pnpm tauri dev` を起動（既知手順。起動完了まで待機）
2. テスト用一時フォルダ作成: `C:\Users\gonda\AppData\Local\Temp\arcagate-watch-test-YYYYMMDD\`
   （PowerShell: `New-Item -ItemType Directory -Path "$env:TEMP\arcagate-watch-test-$(Get-Date -Format yyyyMMdd)"`）
3. Settings → Watched Folders を開き、そのパスを追加・自動追加 ON に設定
4. Library の現在アイテム件数をスクショ + メモ: `tmp/screenshots/PH-20260422-003/01-before.png`

### Step 2: ON 状態での新規ディレクトリ検知

1. PowerShell で監視フォルダ配下に 3 つのサブディレクトリを作成:
   `sub-a`, `sub-b`, `sub-c`
2. 10 秒待機（fsevents + debounce の到達時間）
3. Library を再描画（タブ切り替え or F5 相当）
4. スクショ `02-after-on.png`
5. 判定: Library のアイテム数が **+3** 増えていること

### Step 3: 重複追加の確認

1. 同じ `sub-a` を削除 → 再作成
2. 10 秒待機
3. Library のアイテム数が変わっていないこと（削除分と追加分で相殺 or 既存扱いで変化なし）
4. スクショ `03-after-duplicate.png`

### Step 4: OFF 状態での検知停止

1. Settings で監視フォルダの自動追加を OFF
2. PowerShell で `sub-d` を新規作成
3. 10 秒待機
4. Library のアイテム数が増えていないことを確認
5. スクショ `04-after-off.png`

### Step 5: 不合格時の修正

Step 2-4 のいずれかが期待通りでない場合:

- **イベントが拾えていない**: `src-tauri/src/services/fs_watcher.rs`（または相当ファイル）の
  `notify::Watcher::watch` 登録箇所を確認。`let _ =` で握り潰していたら
  `if let Err(e) = ... { log::warn!(...) }` に直す（lessons.md ルール違反）
- **重複追加**: `item_repository` の `create` で path UNIQUE 制約 or existence check を追加
- **OFF が効かない**: 設定変更が watcher に伝わる経路（config → service → watcher restart / stop）を確認

修正ごとに 1 commit、メッセージは `fix(PH-20260422-003): <要約>`。

### Step 6: E2E テスト追加

`tests/e2e/watched-folder.spec.ts` に以下を追加:

- 監視ディレクトリ追加 → ON → fs イベント模擬 → Library に反映
- OFF → fs イベントで反映されない

実ファイルシステム操作が難しい場合、Tauri の `invoke` でイベントをエミュレートする
コマンドを追加することも検討（ただしスコープ拡張判断はユーザなので、代替として
自動テストはスキップし手動検証だけで閉じてもよい）。

**コミット**: `test(PH-20260422-003): 監視フォルダ E2E 追加`（スキップ時は追加なし）

### Step 7: 完了処理

1. frontmatter `status: wip` → `done`
2. 最終コミット → PR → CI → merge → archive 移動

## 受け入れ条件

- [ ] ON 状態で新規サブディレクトリ 3 件 → Library に 3 件追加される
- [ ] 同一パスの重複追加が発生しない
- [ ] OFF 状態で新規サブディレクトリを作っても Library に追加されない
- [ ] watcher のエラーパスがログに出力される（`let _` で握り潰されていない）
- [ ] `tmp/screenshots/PH-20260422-003/` に検証スクショが 4 枚以上
- [ ] `pnpm verify` 通過

## 禁止事項

- ORM の導入禁止（rusqlite + 生 SQL で実装）
- `src/lib/components/ui/` 手動編集禁止
- 監視フォルダ仕様の拡張（再帰深度変更・除外パターン追加など）はスコープ外

## 停止条件

- OS レベルで fsevents が届かない（ユーザ環境固有問題の疑い） → 停止してログ
- repository の UNIQUE 制約追加が既存 migration を破壊しそう → 停止して判断待ち
