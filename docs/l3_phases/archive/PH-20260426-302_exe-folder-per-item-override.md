---
id: PH-20260426-302
status: done
batch: 69
type: 改善
---

# PH-302: ExeFolderWatchWidget per-item exe override（編集 UI + 起動反映）

## 横展開チェック実施済か

- batch-67 PH-290 の per-card override パターンと同じ「override JSON 文字列を DB に持つ」流儀を踏襲
- 「リセットボタン」「グローバル/個別」の表示文言は LibraryDetailPanel と整合
- WidgetSettingsDialog ではなくウィジェット内インライン編集（item 数だけ操作する想定）

## 参照した規約

- batch-67 PH-290（per-card override 実装）
- `docs/desktop_ui_ux_agent_rules.md` P3 主要操作可視化
- `arcagate-engineering-principles.md` §6 SFDIPOT Function

## 背景・目的

PH-301 で「最大サイズ exe を自動選択」する基本実装。ユーザが個別フォルダで別 exe を選びたい場合の override。

## 仕様

### Override 保存先

ウィジェット config の `item_overrides: Record<folder_path, exe_path>`（PH-301 で型定義済）。
DB 上は既存 `workspace_widgets.config` JSON に保存。

### 編集 UI（ウィジェット内インライン）

各 entry の右に「⋯」ボタン（`MoreHorizontal`）→ クリックで候補 exe list popover:

```svelte
<button onclick={() => openCandidatePopover(entry)}>
    <MoreHorizontal class="size-3" />
</button>

{#if candidatePopoverOpen === entry.folderPath}
    <div role="menu">
        {#each entry.exeCandidates as cand}
            <button onclick={() => selectExe(entry, cand)}>
                {cand.name} ({formatBytes(cand.sizeBytes)})
                {#if currentExe === cand.path} ✓ {/if}
            </button>
        {/each}
        {#if config.item_overrides?.[entry.folderPath]}
            <button onclick={() => clearOverride(entry)}>自動選択（最大サイズ）に戻す</button>
        {/if}
    </div>
{/if}
```

### 起動時の解決ロジック

```typescript
function resolveExe(entry: ExeFolderEntry): string {
    const override = config.item_overrides?.[entry.folderPath];
    if (override && entry.exeCandidates.some((c) => c.path === override)) {
        return override;
    }
    return entry.exeCandidates[0]?.path; // 最大サイズ
}
```

### selectExe / clearOverride

`config.item_overrides` を更新 → `cmd_update_widget_config` で保存 → ウィジェット再描画。

### ラベル原則

- 「⋯」ボタン aria-label = 「{folderName} の起動 exe を選ぶ」（機能ベース）
- 候補メニュー項目 = exe 名 + サイズ（アイコン名禁止）
- 「自動選択（最大サイズ）に戻す」（動詞）

## 受け入れ条件

- [ ] 各 entry に override 編集ボタン [Function, U]
- [ ] 候補 popover で別 exe を選択 → DB 反映 → 起動先変化 [Function]
- [ ] 「自動選択に戻す」で override 解除 [Function]
- [ ] 候補が 1 個しかない folder は popover 非表示（選択肢 1 個のメニュー禁止）[P consistency]
- [ ] `pnpm verify` 全通過

## 自己検証

- 複数 exe folder で override 切替 → 起動 exe が変わる
- override 解除で最大サイズ exe に戻る
- 候補 1 個 folder は ⋯ ボタン非表示
