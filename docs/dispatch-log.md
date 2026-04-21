# Dispatch Log

ディスパッチ運用の作業ログ（append-only）。

---

## 2026-04-22 (セッション開始)

ディスパッチ初回起動。Step 0 のコンテキスト読み込み完了。

---

## 2026-04-22 [PH-20260422-001] start

- Step 0: CLAUDE.md / dispatch-operation.md / lessons.md / desktop_ui_ux_agent_rules.md / vision.md / 全 Plan 5 件を読了
- Step 1: git fetch → feature/ui-dx-refinement が origin と同期、develop なし → 期待通り
- status: todo → wip に更新してコミット (080fdc6)
  - dprint フォーマット差分で pre-commit hook が失敗 → `pnpm dprint fmt` で修正後コミット

---

## 2026-04-22 [PH-20260422-001] step: develop ブランチ作成

- `git switch main && git pull --ff-only` → up to date
- `git switch -c develop && git push -u origin develop` → origin/develop 作成完了
- PR #4 作成: feature/ui-dx-refinement → develop
  - 1回目 CI: dprint check 失敗（dispatch-operation.md / PH-20260422-004_widget-detail-panel-verification.md）
  - `pnpm dprint fmt` で修正 → commit 753d0c3 → push → CI 再実行中

---

## 2026-04-22 Phase B 事前メモ（CI 待ち中に作成）

### PH-20260422-002: ウィジェットズーム実機検証

**想定リスク**:

- Ctrl+scroll の `wheel` イベントは `on:wheel|capture` か `on:wheel|nonpassive` が必要な場合がある
  （Svelte 5 の event handling 変更で `passive` がデフォルトになった可能性）
- ズーム永続化先が `config` テーブルか `workspace` テーブルか Plan で明確でない
  → `src/lib/state/workspace.svelte.ts` と `config.svelte.ts` 両方確認が必要
- Ctrl+scroll を WorkspaceLayout 全体で受けるか個別ウィジェットで受けるかで DOM 設計が変わる

**受け入れ条件の曖昧さ**:

- 「ウィジェットが重ならない」とあるが、zoom 後に grid の配置ロジックがどう動くか不明
  → `transform: scale()` は DOM サイズを変えないので grid collapse は起きないはず。確認要

**着手前に確認すべきファイル**:

- `WorkspaceLayout.svelte` の wheel handler 有無
- `config.svelte.ts` の保存可能キー一覧

---

### PH-20260422-003: 監視フォルダ実機検証

**想定リスク**:

- `notify` の Windows WatchDescriptor エラーは `let _ = w.watch(...)` で握り潰されている可能性大
  → lessons.md にも明記されているパターン
- テスト用フォルダ `C:\Users\gonda\AppData\Local\Temp\arcagate-watch-test-YYYYMMDD\` に空き容量・権限の問題はないはず
- 自動追加 ON/OFF の設定キーが DB に存在するか、設定変更が watcher 再起動にどう伝わるか確認要
- 重複追加の回避が UNIQUE 制約か EXISTS check かで DB migration 影響が変わる
  → もし migration が必要なら停止条件に引っかかる可能性

**受け入れ条件の曖昧さ**:

- 「Library のアイテム数が +3 増えていること」= タブ切り替えで再取得できるか、
  それとも store が自動更新されるかが UI 側に依存する

---

### PH-20260422-005: LibraryMainArea $effect レース対応

**想定リスク**:

- `$effect` の cleanup return が Svelte 5 で正しく動作するか確認が必要
  （Svelte 4 では `onDestroy` だったが Svelte 5 runes では `$effect` のクリーンアップが別途定義）
- 方式 A（request ID）はシンプルで IPC 層変更なし → 低リスク
- 同パターンが他コンポーネントに広範に存在する場合は停止条件に該当
  → 事前に `grep -r "loadItems\|invoke(" src/lib/components/arcagate/library/` で確認推奨

**受け入れ条件の曖昧さ**:

- 「タグ高速切替で最新結果が必ず表示される」は実機での主観確認なので、
  1秒以内に5回クリックを基準として行う（Plan の定義に従う）

---

## 2026-04-22 Phase B サブエージェント準備メモ

Phase B（002/003/005）は `scope_files` 重複なし + `parallel_safe: true` → 並列化可能。
PR #4 が緑になり次第、3 本を Task tool で並列サブエージェントとして起動する。

各サブエージェントに渡す共通コンテキスト:

- ベースブランチ: `develop`
- 作業ブランチ命名: `feature/ph-YYYYMMDD-NNN-<slug>`
- `pnpm verify` を各コミット前に必須実行
- スクショは `tmp/screenshots/PH-YYYYMMDD-NNN/` に保存
- dispatch-operation.md §2 の完了処理（PR → CI → squash merge → archive）まで実行
- CLAUDE.md 禁止事項: shadcn/ui 手動編集禁止・ORM 禁止・`--no-verify` 禁止・main push 禁止

---

## 2026-04-22 Plan 候補メモ（次セッション用）

ディスパッチ中に気づいた観点。**新規 Plan ファイルは作成しない**（ユーザが作る）。

1. **shadcn / AG トークン統合**: `dispatch-operation.md`・`lessons.md` に記録済みの二重管理問題。
   `--background` 等 shadcn トークンを `--ag-*` から算出するブリッジ CSS の実装。
   大規模リファクタのため独立フェーズ必須。

2. **グローバルホットキー動作確認**: REQ-20260226-003 のグローバルホットキー（コマンドパレット呼び出し）
   が実機で正常動作するか未検証。設定 UI との連動含め確認が必要。

3. **システムトレイ常駐 + 自動起動**: REQ-20260226-003 のうち起動時自動起動設定が実装・検証済みか不明。

4. **起動ログ動作確認**: REQ-20260226-004 の起動回数・最終起動日時の記録が
   コマンドパレットからの起動で正しく動くか E2E 検証がない。

5. **LibraryDetailPanel の Esc ハンドラ存在確認**: PH-20260422-004 の前提確認として
   Library 側パネルに Esc ハンドラが実装済みかチェック（lessons.md ルール）。
