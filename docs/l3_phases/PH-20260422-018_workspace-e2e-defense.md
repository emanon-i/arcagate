---
status: done
phase_id: PH-20260422-018
title: Workspace 操作 E2E 防衛（D&D・リサイズ・永続化）
depends_on:
  - PH-20260422-016
scope_files:
  - tests/e2e/workspace-editing.spec.ts
parallel_safe: true
---

# PH-20260422-018: Workspace 操作 E2E 防衛

## 目的

PH-20260422-014〜016 で修復した Workspace 編集操作（D&D 配置・リサイズ・永続化）の
リグレッション防衛テストを追加する。

## 設計判断

- ファイル: `tests/e2e/workspace-editing.spec.ts`（新規）
- E2E フレームワーク: Playwright + Tauri CDP（既存パターンに準拠）
- ウィジェット操作は DOM ベース（`locator.dragTo` / `dispatchEvent`）で実装
- 永続化検証: ウィジェット位置変更後にリロードして同じ位置か確認（DB 保存の確認）

## 実装ステップ

### Step 1: テストファイル作成

`tests/e2e/workspace-editing.spec.ts` を新規作成。以下の 3 テストを実装:

**テスト 1: ウィジェット追加 D&D**

```
1. Workspace タブに移動
2. 鉛筆アイコンクリック → 編集モード
3. サイドバーの "Recent" ボタンを grid セル [col=2, row=1] にドラッグ
4. ウィジェットが配置されることを確認（grid-column / grid-row スタイル）
5. ✓ ウィジェット数が増えていること
```

**テスト 2: ウィジェット移動（ドラッグハンドル）**

```
1. 編集モードに入る
2. 既存ウィジェットのドラッグハンドル（aria-label="ウィジェットを移動"）を別セルへドラッグ
3. ✓ ウィジェットの grid-column / grid-row スタイルが変更されていること
4. チェックマーク（確定）クリック → 編集モード終了
5. リロード後も位置が維持されること
```

**テスト 3: ウィジェットリサイズ**

```
1. 編集モードに入る
2. あるウィジェットのリサイズハンドル（aria-label="リサイズ"）で pointermove を dispatch
3. ✓ ウィジェットの grid-column-end / grid-row-end が変化すること
4. ✓ WidgetShell が h-full で表示されること（リサイズ後に overflow なし）
```

### Step 2: IPC ヘルパー活用

既存 `tests/fixtures/tauri.ts` の `invoke` ヘルパーを使い、
テスト前に既知の workspace/widget 状態を DB に作成する。

### Step 3: pnpm verify → pnpm test:e2e

## コミット規約

`test(PH-20260422-018): Workspace D&D・リサイズ・永続化の E2E テスト追加`

## 受け入れ条件

- [x] `tests/e2e/workspace-editing.spec.ts` が新規作成されている
- [x] 3 テストがローカルの `pnpm test:e2e` で通過する（アプリ起動時に確認）
- [x] `pnpm verify` 通過

## 停止条件

- Playwright の `dragTo` が Tauri WebView2 で動作しない → `dispatchEvent` ベースの代替を試みる。それでも失敗 → 停止して報告
- CDP 接続できない → 停止して報告
