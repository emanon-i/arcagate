---
id: PH-20260426-303
status: todo
batch: 69
type: 防衛
---

# PH-303: ExeFolderWatchWidget E2E + Rust ユニット

## 横展開チェック実施済か

- 既存 `tests/e2e/widget-display.spec.ts` 等の widget E2E パターン踏襲
- @smoke 選定基準（lessons.md「IPC 連鎖最小」）に従い 2 件以下に絞る

## 参照した規約

- `arcagate-engineering-principles.md` §6 テストピラミッド
- `lessons.md`: @smoke 選定基準 / Playwright 注意点

## テストケース

### Rust 単体（PH-300 で先行）

`services/exe_scanner_service.rs` の tests:

1. tempfile で 1 階層 root + 1 サブフォルダ + 2 exe → 1 entry, candidates size 降順
2. depth=2 で 2 階層下まで scan
3. depth=0 / depth=4 → clamp 1..=3
4. exe 0 個サブフォルダは除外
5. 不在 root → 空 Vec、AppError 無し
6. *.ico 検出 → entry.icon_path に最初の 1 件

### E2E

#### 1. ExeFolderWatchWidget が追加可能 + 設定で watch_path 指定 @smoke

```typescript
test('ExeFolderWatchWidget をワークスペースに追加 + 設定 + 表示', { tag: '@smoke' }, async ({ page }) => {
    // ワークスペース edit mode → ウィジェット追加 → exe_folder 選択
    // 設定モーダル → watch_path + depth
    // entries が表示される（または空状態）
});
```

#### 2. menuItems = 1 で DropdownMenu 出ない（横展開検証）

```typescript
test('Widget 設定ボタン押下で DropdownMenu DOM が出現せずモーダルが直接開く', async ({ page }) => {
    // 各ウィジェット種で設定ボタン click
    // DropdownMenu 用 DOM (data-radix-menu / role=menu) が出現しない
    // 設定モーダル role=dialog が出現
});
```

#### 3. per-item override 切替 → 起動 exe 変化

```typescript
test('per-item override で起動先 exe が変わる', async ({ page }) => {
    // entry の ⋯ ボタン → 候補リスト → 別 exe 選択
    // launchItem を spy / mock して exe path を確認
});
```

## 受け入れ条件

- [ ] Rust 単体 6 件緑
- [ ] E2E 3 件緑（@smoke 1 件、nightly 2 件）
- [ ] 全ウィジェット種で DropdownMenu 出ない E2E（PH-297 横展開検証と統合）
- [ ] `pnpm verify` 全通過

## 自己検証

- ローカル smoke E2E pass
- 実フォルダで CDP スクショ取得
