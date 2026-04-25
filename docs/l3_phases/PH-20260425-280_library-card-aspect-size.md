---
id: PH-20260425-280
status: done
batch: 65
type: 改善
---

# PH-280: Library カード 4:3 アスペクト + S/M/L カード全体サイズ + gap 固定 + 外側 padding 吸収

## 参照した規約

- `docs/l1_requirements/ux_standards.md`: §2 サイズプリセット（S/M/L）/ §3 a11y（focus-visible / contrast）
- `docs/desktop_ui_ux_agent_rules.md`: §1 情報密度・余白
- `arcagate-engineering-principles.md` §6 SFDIPOT: Function / Data / Operations / Time
- メモリ `project_library_card_spec.md`（確定仕様）
- `feedback_self_verification.md`（実機目視必須）

## 背景・目的

PR #97（close 済み）が以下の仕様違反で取り下げられた。

- `aspect-square`（1:1）→ 仕様は **4:3**
- `gap-3`（12px）に変更 → 仕様は **gap-4 = 16px 固定**
- S/M/L で **アイコン画像の中身だけ**が変わる → 仕様は **カード全体（width × height）が変わる**
- ウィンドウ幅で カード幅 stretch（`1fr` minmax）→ 仕様は **カード幅は固定、外側 padding が変動**

ユーザフィードバック原文:

> SML 全部アイコン画像のサイズが変わるだけなんだけど何だこれ？
> あとカード間の隙間の幅は変えるなと言ったのに変わるし何にしてんの？
> 正方形じゃなくて 4:3 のままにしてくれ

## 仕様

### A. アスペクト比

- **`aspect-[4/3]` 固定**。`aspect-square` 禁止。
- 高さは width × 3/4 で自動決定。

### B. S/M/L カード全体サイズ

`itemSize` プリセット → カード width:

| サイズ | width | height (auto) |
| ------ | ----- | ------------- |
| S      | 144px | 108px         |
| M      | 192px | 144px         |
| L      | 256px | 192px         |

数値は ux_standards.md §2 に揃える（最終決定はベースライン整合で agent 判断、ただし 1.5x 比で M を中心に置く）。

実装では `--ag-card-w` CSS 変数で受け、コンポーネント側は `style="width: var(--ag-card-w)"` 適用。

### C. グリッドレイアウト

- `display: grid`
- `grid-template-columns: repeat(auto-fill, var(--ag-card-w))`
- `gap: 16px`（**`var(--ag-card-gap)` = 1rem 固定。変更禁止**）
- `justify-content: center`（余り横幅は外側 padding として均等吸収）
- `min-w-0` を子に必ず付ける（grid 内 truncate 確保）

`minmax()` 使用禁止（カードサイズが流動化する）。`1fr` 使用禁止（同上）。

### D. ラベル位置

カード全面が画像なので、ラベルは下部にグラデーションオーバーレイで配置:

```html
<div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
  <div class="truncate text-sm font-semibold text-white">{label}</div>
  <div class="truncate text-xs text-white/80">{target}</div>
</div>
```

S サイズはオーバーレイ縮小（`p-1.5` / `text-xs`）。

### E. アイコンの扱い

- `item.icon_path` あり → `<img>` を `object-cover` で全面配置
- `item.icon_path` なし → 現状の `artMap[item.item_type]` グラデーション + 中央 ItemIcon（残す）

## 作業内容

### LibraryCard.svelte

- `iconAreaClass` の `h-[Npx] w-[Npx]` 撤去 → カード全体に `aspect-[4/3]` + `style="width: var(--ag-card-w)"`
- `--ag-card-w` を `configStore.itemSize` から CSS 変数で渡す（親側で）
- ラベルを下部オーバーレイに変更
- S/M/L で `iconClass` のサブ icon サイズも調整（icon_path なし時のみ使用）

### LibraryMainArea.svelte

- グリッドの `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))` →
  `grid-template-columns: repeat(auto-fill, var(--ag-card-w))`
- `[&>*]:max-w-sm` 削除（カード幅は CSS 変数で固定）
- `gap-4` 維持
- container に `style="--ag-card-w: <px>"` を `configStore.itemSize` 連動で付与
- container に `justify-content: center` 追加
- リスト表示モード（`viewMode === 'list'`）はグリッドを使わないため対象外

### CSS 変数定義

`src/lib/styles/arcagate-theme.css`（または近傍）に固定値を定義:

```css
:root {
  --ag-card-gap: 1rem;
  --ag-card-w-s: 144px;
  --ag-card-w-m: 192px;
  --ag-card-w-l: 256px;
}
```

LibraryMainArea で `configStore.itemSize` から該当 var 名を切り替え:

```svelte
<div
  class="library-grid"
  style="--ag-card-w: var(--ag-card-w-{configStore.itemSize.toLowerCase()})"
>
```

## 受け入れ条件

- [ ] LibraryCard が `aspect-[4/3]` で表示される [Function, Data]
- [ ] S/M/L 切替で **カード width × height** が同時に変わる（アイコンのみではない） [Function]
- [ ] アイテム間 gap が S/M/L すべてで 16px 固定（CDP computed style で確認） [Data]
- [ ] ウィンドウ幅変更でカード幅は変わらず、外側 padding が増減する [Data, Operations]
- [ ] 設定切替が即時反映される（ワークスペース再読込不要） [Time]
- [ ] icon_path あり時はカード全面に画像が cover で表示される [Function]
- [ ] ラベルが下部オーバーレイで読める（contrast WCAG AA 以上） [Function, U]
- [ ] `pnpm verify` 全通過

## 自己検証（OK と言う前に必須）

- CDP で S/M/L 各モードのスクショ取得
- `getComputedStyle(grid)` で `gap`, `gridTemplateColumns`, `justifyContent` を確認
- `getBoundingClientRect()` で各カードの width/height/aspect 確認
- ウィンドウ幅 800 / 1200 / 1600 で列数変化を確認、カード幅は不変を確認
- HICCUPPS: Steam Big Picture / iOS App Library / Kodi と比較して違和感ないか
