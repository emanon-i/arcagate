---
id: PH-20260425-281
status: done
batch: 65
type: 改善
---

# PH-281: Library カード文字色 picker + 縁取り + ラベル位置オーバーレイ強化

## 参照した規約

- `docs/l1_requirements/ux_standards.md`: §3 a11y（contrast）/ §4 タイポ
- `arcagate-engineering-principles.md` §6 HICCUPPS: U（User）/ I（Image）
- メモリ `project_library_card_spec.md`（ラベル表示節）

## 背景・目的

カード全面が画像になる（PH-280）と、ラベル文字が画像の上に乗るため、画像の色によっては読めなくなる。
ユーザ確定仕様:

- 文字色（color picker）変更可能、デフォルト白
- 縁取り（text-stroke）ON/OFF + 色 + 太さ
- 塗りつぶし背景オーバーレイ ON/OFF（残す）

S サイズはオーバーレイ縮小、M/L は通常サイズ。

## 仕様

### 設定項目（Config 構造）

`config_store` に以下を追加（`LibraryCardStyleConfig` 型）:

```typescript
interface LibraryCardStyleConfig {
  textColor: string;        // hex / oklch / 'inherit'
  strokeEnabled: boolean;
  strokeColor: string;
  strokeWidthPx: number;    // 0 〜 4 範囲、 step 0.5
  overlayEnabled: boolean;  // 下部グラデオーバーレイ
}
```

デフォルト値:

```ts
{
  textColor: '#ffffff',
  strokeEnabled: false,
  strokeColor: '#000000',
  strokeWidthPx: 1,
  overlayEnabled: true,
}
```

DB 保存はせず、`localStorage` の既存 `configStore` パターン踏襲。

### LibraryCard 適用

`<style>` または inline style で:

```svelte
<div
  class="absolute bottom-0 left-0 right-0 p-2"
  class:bg-gradient={cardStyle.overlayEnabled}
  style="
    color: {cardStyle.textColor};
    -webkit-text-stroke: {cardStyle.strokeEnabled ? `${cardStyle.strokeWidthPx}px ${cardStyle.strokeColor}` : 'none'};
    paint-order: stroke fill;
  "
>
  {label}
</div>
```

`paint-order: stroke fill` で stroke が文字本体の下に描画される（重要）。

### 設定 UI

設定項目は **PH-282 で作る Settings > Library** に統合する。本 Plan は LibraryCard 側の **適用ロジックと型** のみ完了する。設定 UI は PH-282 で配線。

## 作業内容

- `src/lib/state/config.svelte.ts` に `libraryCardStyle` フィールドを追加
- `LibraryCard.svelte` で `configStore.libraryCardStyle` を参照して inline style を組み立てる
- `paint-order: stroke fill` を必ず付ける
- `bg-gradient` クラスは `overlayEnabled` で出し分け
- localStorage キー: `arcagate-library-card-style`

## 受け入れ条件

- [ ] LibraryCard が configStore.libraryCardStyle の値で文字色を反映する [Function]
- [ ] 縁取り ON で text-stroke が描画される（paint-order 適用） [Function]
- [ ] オーバーレイ OFF で背景グラデが消える [Function]
- [ ] localStorage 永続化が効く（リロード後も維持） [Time, History]
- [ ] デフォルト値で既存表示を壊さない（white + overlay ON + stroke OFF） [P consistency]
- [ ] `pnpm verify` 全通過

## 自己検証

- CDP で `getComputedStyle(label).webkitTextStroke` 確認
- 縁取り ON/OFF をスクショで比較
- 派手な背景画像（白＋黒入り混じり）でも読めることを確認
