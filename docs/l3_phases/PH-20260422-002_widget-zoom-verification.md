---
status: todo
phase_id: PH-20260422-002
title: Ctrl+スクロールによるウィジェットズームの実機検証と修正
depends_on:
  - PH-20260422-001
scope_files:
  - src/lib/components/arcagate/workspace/WorkspaceLayout.svelte
  - src/lib/state/workspace.svelte.ts
  - src/lib/state/config.svelte.ts
parallel_safe: true
---

# PH-20260422-002: ウィジェットズーム実機検証

## 目的

PH-20260311-002 の S-6-2（Ctrl+スクロールでウィジェットをズーム）はコード上
`[x]` だが実機未検証。ディスパッチが実機操作で動作確認し、不具合があれば修正。

## 参照ドキュメント

- UI/UX 原則: `docs/desktop_ui_ux_agent_rules.md`（§1 操作可能性、§3 予測可能性）
- lessons.md: デスクトップ標準（user-select, autocomplete）箇所
- CLAUDE.md: 禁止事項

## 実装ステップ

### Step 1: 実機起動と初期スクショ

1. `pnpm install --frozen-lockfile`（lock 差分があれば）
2. `pnpm tauri dev` をバックグラウンド起動（"Finished" と "App started" の両ログ確認まで最大 60 秒待機）
3. Workspace タブを開き、既存ページがあれば選択、なければ新規作成してウィジェットを 3 個配置（Favorites / Recent Launches / Projects）
4. 初期スクショ: `tmp/screenshots/PH-20260422-002/01-initial.png`

**コミットなし**（検査のみ）

### Step 2: Ctrl+スクロール動作確認

1. ウィジェット領域上でマウスを置き、Ctrl を押しながらマウスホイール上 3 回 / 下 3 回
2. 各段階でスクショ: `02-zoom-plus1..3.png`, `03-zoom-minus1..3.png`
3. Ctrl なしでのホイール回転でページスクロールが機能するか確認（スクショ `04-scroll-without-ctrl.png`）
4. 判定:
   - (a) ズームが段階的に拡縮する（視認可能）
   - (b) ウィジェットが重ならない
   - (c) Ctrl なし時はページスクロールになる（ズームしない）
5. **全てパスしたら Step 4 に飛ぶ**。どれかパスしない場合のみ Step 3 に進む

### Step 3: ズーム未実装 or 不具合 → 修正

- 不具合の性質に応じて `src/lib/components/arcagate/workspace/WorkspaceLayout.svelte` の
  `on:wheel` ハンドラを確認・修正
- ズームスケールは 0.7 〜 1.3 の範囲、step = 0.1 程度
- CSS transform: `transform: scale(var(--widget-zoom, 1))` で子要素に適用
- **コミット**: `fix(PH-20260422-002): Ctrl+scroll ズーム実装/修正`
- 修正後に Step 2 をやり直し、合格するまで最大 3 周で Step 4 へ

### Step 4: ズーム倍率の永続化確認

1. ズームを +2 段階にした状態でアプリを閉じる（Ctrl+Q or 閉じるボタン）
2. `pnpm tauri dev` 再起動
3. 再起動後に同じ倍率でウィジェットが表示されているか確認
4. スクショ `05-persistence-before.png`, `06-persistence-after.png`
5. 永続化されていない場合、`src/lib/state/workspace.svelte.ts` または
   `src/lib/state/config.svelte.ts` に保存処理を追加（SQLite `config` テーブル想定）
6. **コミット**: `feat(PH-20260422-002): ズーム倍率を config に永続化`

### Step 5: E2E テスト追加（可能なら）

`tests/e2e/widget-zoom.spec.ts` に以下をカバーする E2E を追加:

- Workspace を開いて Ctrl+wheel で data-zoom 属性が変わる
- 再起動後も同値であること（fixture を使った永続化テストが難しければ localStorage 確認で代替）

困難な場合はスキップして作業ログに理由を記載。

**コミット**: `test(PH-20260422-002): ウィジェットズーム E2E 追加`

### Step 6: 完了処理

1. frontmatter `status: wip` → `done`
2. 最終コミット: `docs(PH-20260422-002): 完了マーキング`
3. push → PR → CI → merge → archive 移動

## 受け入れ条件

- [ ] Ctrl+wheel でウィジェットが段階的にズームイン/アウトする
- [ ] ズーム範囲内でウィジェットが重ならない
- [ ] Ctrl なし wheel ではページスクロールになり、ズームは発動しない
- [ ] アプリ再起動後にズーム倍率が復元される
- [ ] `tmp/screenshots/PH-20260422-002/` に検証スクショが 6 枚以上
- [ ] `pnpm verify` 通過
- [ ] 既存 E2E が全通過

## 禁止事項

- `src/lib/components/ui/` は触らない
- `package.json` の依存追加・更新は禁止（スコープ外）
- グリッドレイアウト全体のリファクタは禁止（ズーム機能のみに限定）

## 停止条件

- Step 3 を 3 周しても受け入れ条件 a-c が揃わない → 停止してログに原因記録
- ズーム実装のためにアーキテクチャ変更（例: grid → canvas）が必要と判断した → 停止
