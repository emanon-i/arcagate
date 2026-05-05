# §3 既知 issue の root cause trace

## 3.1 I1: EXE 監視 起動 → 「最近起動」記録漏れ

### 再現

1. Workspace に ExeFolderWatchWidget を配置
2. 監視フォルダ追加 + scan で exe 群が表示
3. 任意の exe を click 起動
4. RecentLaunchesWidget を別 workspace に配置
5. **期待**: 起動した exe が Recent に表示
6. **実態**: 表示されない

### root cause (code trace 完了)

**`ExeFolderWatchWidget.svelte:231-241`**:

```ts
async function launchEntry(entry: ExeFolderEntry) {
    const exePath = resolveExe(entry);
    if (!exePath) { ... return; }
    // path 直起動: DB 経由しない（cmd_open_path で OS デフォルト起動）
    void invoke('cmd_open_path', { path: exePath })
        .then(() => toastStore.add(...))
        .catch(...);
}
```

`cmd_open_path` は `launch_service::launch_item` を経由せず、直接 `shell::Command::new` で起動。 → `launch_log` テーブルに INSERT されない → RecentLaunchesWidget / StatsWidget が認識しない。

**FileSearchWidget も同じ pattern** (`cmd_open_path` 直叩き、`FileSearchWidget.svelte:132`)。

### fix 方針

ExeFolder 起動時に Library item を target path で lookup → `launchItem(item.id)` 呼ぶ。
PR #271 (post-redo3 #5) で scan 完了時に `registerExeItemsBulk` で auto-register 済なので item が DB に存在する前提。

```ts
// 案
const item = itemStore.items.find((i) => i.target === exePath);
if (item) {
    await launchItem(item.id);  // launch_log に記録される
} else {
    // fallback: cmd_open_path (旧来の挙動を残す、念のため)
}
```

FileSearchWidget も同様に修正。

### test

- e2e: ExeFolder 起動 → cmd_get_recent_launches で件数が +1 → RecentLaunchesWidget に表示
- unit: launchItem 経路で source パラメータが正しく渡るか

### 修正コスト: **小** (~30 min、2 file 各 5 行)

## 3.2 I2: ItemWidget でアイテム追加できない (クラッシュ系)

### 再現

1. Workspace に ItemWidget 配置 (空状態)
2. 「アイテムを紐付け」 button click → Settings dialog 開く
3. 「アイテムを紐付け」 button (中の picker 起動 button) click → LibraryItemPicker 表示
4. Library item を選択 → 「追加」
5. **期待**: ItemWidget に item が表示
6. **実態**: ??? (user 報告: 「追加できない」、具体的 symptom 不明)

### root cause hypothesis (要 dev 再現)

候補:

- **(a)** Library が空 → picker に item がない → 選択できない (UX 課題、crash ではない)
- **(b)** `selectMany([items])` で `config = {...}` 反映後、WidgetSettingsDialog の `bind:config` が伝搬しない
- **(c)** WidgetSettingsDialog の Save 時に `workspaceStore.updateWidgetConfig` が err を起こす (既存 widget の config schema 不整合)
- **(d)** `pinnedItems` の derive が `itemStore.items.find` で undefined を返し続ける (item id mismatch)

ItemSettings.svelte の `selectMany` (L53-63) と `pinnedItems` derive (L47-51) は code 上 OK。
WidgetSettingsDialog.svelte の bind:config / handleSave は workspace-canvas-rewrite で確認済、健全。

→ **dev で再現 + console error 取得が必要**。Phase L1 で reproduction script を CDP で書いて trace。

### fix 方針 (root cause 確定後)

- (a) なら user 教育 (空 Library での Pickerに「アイテムを先に登録してください」誘導)
- (b) なら bind 修正 + test
- (c) なら schema migration / config sanitize
- (d) なら item lookup 強化 (orphan id を filter out)

### 修正コスト: **中** (再現 + 修正 + test、~1-2 h)

## 3.3 I3: 大量 item で重い (cmd_extract_item_icon 同期 IPC + cmd_get_item_metadata 並列)

### 再現

- 69+ Game カードを Library で表示 → スクロール / リフレッシュで遅延
- Workspace の widget が大量 (40+) で同様

### root cause (code trace 完了)

#### 主犯 1: `cmd_get_item_metadata` 並列発火

**`LibraryCard.svelte:25-36`**:

```ts
$effect(() => {
    if (viewMode !== 'grid' || configStore.itemSize === 'S') return;
    const id = item.id;
    metadata = null;
    void getItemMetadata(id).then(...).catch(...);
});
```

→ 69 cards × 1 IPC = 69 並列 invoke。Tauri 側は `Mutex<Connection>` で sqlite を share、IPC 自体は async だが DB lock contention で実質 serialize + filesystem stat per call。

#### 主犯 2: `cmd_extract_item_icon` 同期 IPC

**Lessons.md C-2 既知**: icon extraction は filesystem read + image parse で 100-500ms 級、同期で main thread block。

呼び出し箇所:

- `ItemForm.svelte:152` (drag-drop 時 1 回、UI block の体感あり)
- ExeFolderWatchWidget の register 時 (auto-register が batched なので各 item で sequential)

#### 主犯 3: drop-shadow / blur フィルタ

LibraryCard が `drop-shadow-lg` を全 icon に適用 → GPU compositing で大量 card 時に paint cost 上昇。

### fix 方針

| candidate | 内容                                                                                      | 修正コスト |
| --------- | ----------------------------------------------------------------------------------------- | ---------- |
| **F1**    | `cmd_get_items_metadata_batch(ids)` を Rust 側に追加、LibraryMainArea で 1 回 batch fetch | 中         |
| **F2**    | item_metadata の memory cache (item.id → metadata + TTL)                                  | 小         |
| **F3**    | icon extraction を `tokio::spawn_blocking` (async non-block)                              | 小         |
| **F4**    | LibraryCard の drop-shadow を S サイズ時 disable                                          | 小         |
| **F5**    | virtualization (visible cards only render)                                                | 大         |

→ Phase L1 で F1 + F2 + F3 (低コスト 3 件)、L3 で F5 (virtualization、大改修)。

### 修正コスト: **F1+F2+F3 で 中** (~3-4 h、Rust + TS 両方触る)

## 3.4 その他 crash / regression

### 認識される他の issue (要再現 + trace)

- **OK?**: `null × null` 表示 (PR #281 で修正済、format-meta.ts)
- **OK?**: ItemWidget 空状態 dialog 違和感 (PR #281 で修正済)
- **未調査**: bulk delete 後 sidebar 件数が更新されない (推測、要再現)
- **未調査**: tag 削除後に item から消えるが UI に残る (推測、要再現)
- **未調査**: item 名前を変更してもクリック先が古いまま (推測、要再現)
- **未調査**: drag-drop file → URL 検出失敗の error message が不親切

→ Phase L1 で dev 再現 + trace + fix を網羅的に実施。

## 3.5 Lessons.md 関連 entries

`docs/lessons.md` C-2: 同期 IPC で main thread block の history。本 I3 と直結。
他に Library 関連 lessons: tag rename / cascade delete の retrospective が L1 fix で参考になりそう。
