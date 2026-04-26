---
id: PH-20260426-301
status: done
batch: 69
type: 改善
---

# PH-301: ExeFolderWatchWidget フロント（ウィジェット + 設定モーダル）

## 横展開チェック実施済か

- 既存 ProjectsWidget が watched_folder + auto_add パターンを持つ → 設定 UX 規約踏襲
- WidgetShell の menuItems = 1 ルール（CLAUDE.md「選択肢1個のメニューを挟むな」）必ず守る
- WidgetSettingsDialog の既存 quick_note / projects 分岐パターンを踏襲（exe_folder 分岐追加）

## 参照した規約

- `docs/desktop_ui_ux_agent_rules.md` §3 設定 UX 統一
- batch-67 PH-294 ux_standards Library 規約（カードサイズ / 表示量）
- CLAUDE.md「選択肢1個のメニューを挟むな」

## 背景・目的

PH-300 の Rust IPC をフロントから利用する `ExeFolderWatchWidget`。
仕様:

- 設定で root path + depth (1〜3) 指定
- IPC 結果をリスト表示（フォルダ名 + アイコン + 「起動」ボタン）
- クリックで最大サイズ exe を起動

## 仕様

### コンポーネント

`src/lib/components/arcagate/workspace/ExeFolderWatchWidget.svelte`:

```svelte
<WidgetShell title={config.title || 'Exe Folders'} icon={FolderOpen} {menuItems}>
    {#if !config.watch_path}
        <p>設定からフォルダと階層を指定してください</p>
    {:else}
        <ul>
            {#each entries as entry}
                <li>
                    <ItemIcon iconPath={entry.iconPath ?? entry.exeCandidates[0]?.path} />
                    <span>{entry.folderName}</span>
                    <button onclick={() => launchEntry(entry)}>起動</button>
                </li>
            {/each}
        </ul>
    {/if}
</WidgetShell>
```

### menuItems

1 個のみ: 「設定」→ `WidgetSettingsDialog` を開く（`menuItems.length === 1` で即実行）。

### Widget config 型

`src/lib/types/widget-configs.ts` に `ExeFolderWatchConfig`:

```typescript
export interface ExeFolderWatchConfig {
    watch_path?: string;
    scan_depth?: 1 | 2 | 3;
    title?: string;
    item_overrides?: Record<string, string>; // folder_path → exe_path（PH-302 で使用）
}
```

### 設定ダイアログ拡張

`WidgetSettingsDialog.svelte` の widget_type === 'exe_folder' 分岐を追加:

- フォルダ選択（既存 `handlePickFolder` 流用）
- scan_depth セレクト（1 / 2 / 3）
- title 入力

### 登録

- `widget_type` enum に `'exe_folder'` 追加（Rust 側 `models/workspace.rs` も）
- 「ウィジェット追加」UI に「Exe Folders」候補を出す
- 既存 widget_type 切替パターン踏襲

### IPC 呼び出し + キャッシュ

ウィジェット mount 時 + `watch_path` / `scan_depth` 変更時に `cmd_scan_exe_folders` 呼び出し。
result をローカル `$state` に保持。短時間内の連続呼び出しは debounce。

## 受け入れ条件

- [ ] ExeFolderWatchWidget がワークスペースに追加可能 [Function]
- [ ] 設定モーダルで watch_path + scan_depth 設定可能 [Function]
- [ ] menuItems = 1（「設定」のみ）= 即モーダル [P consistency]
- [ ] entries クリックで最大サイズ exe を `cmd_launch_item` 経由で起動 [Function]
- [ ] 設定変更 → 即反映（再 scan）[Time]
- [ ] `pnpm verify` 全通過

## 自己検証

- 実フォルダ（D:\Tools 等）を watch path にして表示
- depth 1/2/3 で結果が変化
- メニューが DropdownMenu で出ない（CDP DOM 確認）
