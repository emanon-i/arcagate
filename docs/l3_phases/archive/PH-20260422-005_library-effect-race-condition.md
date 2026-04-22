---
status: done
phase_id: PH-20260422-005
title: LibraryMainArea の $effect race condition 対応
depends_on:
  - PH-20260422-001
scope_files:
  - src/lib/components/arcagate/library/LibraryMainArea.svelte
parallel_safe: true
---

# PH-20260422-005: LibraryMainArea $effect レースコンディション

## 目的

lessons.md に「技術的負債（F-3b コードレビューで検出）」として記録されている
`LibraryMainArea.svelte` の `$effect` レース問題に対処する。
`activeTag` / `searchQuery` を高速切替した際に、古い IPC レスポンスが後から届いて
結果リストを上書きする可能性がある。現状は IPC <10ms のため実害は小さいが、
将来のデータ増大や IPC 遅延で顕在化し得るので、AbortController or request ID 方式で
安全化する。

## 参照ドキュメント

- `docs/lessons.md` L5-11（技術的負債の記述）
- UI/UX 原則: `desktop_ui_ux_agent_rules.md` §3 予測可能性・§2 反応性

## 実装ステップ

### Step 1: 現状把握

1. `src/lib/components/arcagate/library/LibraryMainArea.svelte` を読む
2. `$effect` 内の IPC 呼び出し（`loadItemsByTag` 等）の位置を特定
3. 現在の依存配列・非同期ハンドリング方式を把握
4. 他に同種のパターンがないか Library 周辺コンポーネントを grep（LibraryLayout 等）

**コミットなし**（調査のみ）

### Step 2: 対処方針の決定

以下 2 方式のどちらか:

**方式 A: request ID**

```ts
let currentRequestId = 0;
$effect(() => {
  const myId = ++currentRequestId;
  loadItemsByTag(activeTag).then(result => {
    if (myId !== currentRequestId) return; // stale
    items = result;
  });
});
```

**方式 B: AbortController**

```ts
$effect(() => {
  const ctrl = new AbortController();
  loadItemsByTag(activeTag, ctrl.signal).then(...).catch(ignoreAbort);
  return () => ctrl.abort();
});
```

IPC 側（Tauri invoke）が AbortSignal を素直に扱えない可能性があるので **方式 A を基本**とする。
IPC 層に手を入れない範囲で済む。

### Step 3: 実装

1. `LibraryMainArea.svelte` の `$effect` を方式 A に書き換える
2. `currentRequestId` は `let currentRequestId = 0` としてコンポーネント内に保持
3. 各 IPC 呼び出し直前に `myId = ++currentRequestId`、戻り後に `if (myId !== currentRequestId) return`
4. 同様のパターンが複数ある場合、内部ヘルパー関数に抽出（インライン 3 箇所以上なら抽出）

**コミット**: `fix(PH-20260422-005): LibraryMainArea の $effect に request ID 方式で race 対策`

### Step 4: 手動検証

1. `pnpm tauri dev` 起動
2. Library でタグを高速に切り替え（5 タグを 1 秒以内に連続クリック）
3. 最後にクリックしたタグのアイテムが表示されていることを確認
4. 同様に searchQuery にも高速入力で連続検索 → 最後の入力結果が反映されること
5. スクショ: `tmp/screenshots/PH-20260422-005/01-tag-switch.png`, `02-search-type.png`

### Step 5: 単体テスト追加（可能なら）

Svelte コンポーネントテスト or ユーティリティ関数化してユニットテスト:

- `tests/unit/request-id.test.ts`（抽出したヘルパー関数のテスト）
- 古いリクエストが返っても state が更新されない

**コミット**: `test(PH-20260422-005): request ID ヘルパーのユニットテスト追加`
（抽出しなかった場合はスキップ）

### Step 6: lessons.md の技術的負債セクションから該当項目を削除

lessons.md の L5-11 付近「LibraryMainArea.svelte の $effect race condition」節を
削除し、対応済み旨のコメント 1 行に差し替え（または単純削除）。

**コミット**: `docs(PH-20260422-005): lessons.md から対応済み技術的負債を削除`

### Step 7: 完了処理

1. frontmatter `status: wip` → `done`
2. 最終コミット → PR → CI → merge → archive 移動

## 受け入れ条件

- [x] LibraryMainArea.svelte の `$effect` が request ID 方式になっている
- [x] タグ高速切替 / 検索高速入力で最新結果が必ず表示される（localTagItems により stale レスポンスを無視）
- [x] lessons.md の該当記述が削除または対応済みに差し替えられている
- [x] `pnpm verify` 通過
- [x] 既存 E2E の Library 関連テストが引き続き通過

## 禁止事項

- IPC 層（Tauri invoke ラッパー）の変更禁止（スコープ外）
- Library のデータフロー全体のリファクタ禁止
- state 管理ライブラリの導入禁止（既存の Svelte 5 runes で完結）

## 停止条件

- 方式 A で解決できず、方式 B（AbortController）が必要と判断 → IPC 層への影響を
  見極めるため停止してログ記録
- 同じパターンが他コンポーネントにも広範に存在すると判明 → スコープ拡張判断のため停止
