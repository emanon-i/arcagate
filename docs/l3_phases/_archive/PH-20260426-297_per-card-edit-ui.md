---
id: PH-20260426-296
status: done
batch: 68
type: 改善
---

# PH-296: per-card 編集 UI（focal point スライダー / 色 picker on LibraryDetailPanel）

## 参照した規約

- batch-67 PH-290（per-card override データ層 + リセットボタン実装済）
- `docs/desktop_ui_ux_agent_rules.md` P3 主要操作可視化
- `feedback_no_idle_dispatch.md`

## 背景・目的

PH-290 でデータ層と「グローバル設定に戻す」ボタンまで実装したが、per-card で **新規に override を作る UI** がない。
ユーザは現状 `cmd_update_item` を直接呼ばないと per-card 設定できない。

## 仕様

### LibraryDetailPanel に「カード表示」セクション拡張

```svelte
<section class="mt-4 space-y-3 border-t pt-4">
  <h4>カード表示</h4>

  <!-- 編集モードトグル -->
  <button onclick={toggleEditMode}>
    {editMode ? 'カード設定を閉じる' : 'このカードだけ調整'}
  </button>

  {#if editMode}
    <!-- focal point X/Y スライダー（image モード時） -->
    <RangeRow label="X (横)" value={localFocalX} ... />
    <RangeRow label="Y (縦)" value={localFocalY} ... />

    <!-- 文字色 picker -->
    <ColorRow label="文字色" value={localTextColor} ... />

    <!-- 適用 / リセット ボタン -->
    <button onclick={applyOverride}>カード設定を適用</button>
    <button onclick={resetOverride}>グローバル設定に戻す</button>
  {/if}
</section>
```

### 動作

- 編集モード OFF: 既存リセットボタンのみ（PH-290）
- 編集モード ON: 現在の override（または global）を初期値にしたコントロール表示
- 「適用」ボタンで `cmd_update_item({ card_override_json: JSON.stringify(...) })`
- 「リセット」で `card_override_json: null`

### 共通 snippet 再利用

`LibraryCardSettings.svelte` で定義した `ColorRow` / `RangeRow` snippet を export して再利用…
は Svelte 5 で snippet export がまだ複雑なので、本 Plan ではコンポーネント化を検討:

`src/lib/components/common/SettingsRow/`:

- `ColorRow.svelte`
- `RangeRow.svelte`

LibraryCardSettings と LibraryDetailPanel で共通利用。

## 受け入れ条件

- [ ] 「このカードだけ調整」ボタンで編集モード切替
- [ ] focal point / 文字色を変えて「適用」で per-card override 作成
- [ ] 「リセット」で override 解除（PH-290 の既存ボタンと統合）
- [ ] LibraryCard 即時反映
- [ ] `pnpm verify` 全通過

## 自己検証

- 編集モード ON → スライダー操作 → カードが追従（CDP スクショ）
- 適用 → リロード後も per-card 設定が保持
- リセットでグローバル設定と一致
