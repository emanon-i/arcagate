# UX 標準 Part 2 — §4 スペーシング / §5 インタラクション

[ux-standards.md](./ux-standards.md) §1-3 の続編。

## 4. スペーシング・タイポグラフィ標準

### 4-1. スペーシングスケール

Tailwind のデフォルト 4px ベースを使用（`p-1` = 4px、`p-2` = 8px 等）。
Arcagate で頻出するスペーシング:

| Tailwind クラス | 値   | 用途                             |
| --------------- | ---- | -------------------------------- |
| `gap-1`         | 4px  | アイコン + ラベル間、バッジ内部  |
| `gap-2`         | 8px  | インラインアイテム間             |
| `gap-3`         | 12px | フォーム要素間                   |
| `gap-4`         | 16px | セクション内の要素間（標準）     |
| `gap-6`         | 24px | セクション間                     |
| `gap-8`         | 32px | 大セクション間（ページレベル）   |
| `p-4`           | 16px | カード・パネルの内側余白（標準） |
| `p-6`           | 24px | ダイアログの内側余白             |

### 4-2. タイポグラフィスケール

| 用途                     | Tailwind    | 実値 | 行間 | 用途例                   |
| ------------------------ | ----------- | ---- | ---- | ------------------------ |
| キャプション / バッジ    | `text-xs`   | 12px | 1.5  | タグチップ、キーヒント   |
| 補助テキスト             | `text-sm`   | 14px | 1.5  | リスト行、フォームヒント |
| 本文 / UI ラベル（標準） | `text-base` | 16px | 1.5  | パネル内テキスト         |
| 小見出し                 | `text-lg`   | 18px | 1.4  | ウィジェットタイトル     |
| 見出し                   | `text-xl`   | 20px | 1.3  | ダイアログタイトル       |
| 大見出し                 | `text-2xl`  | 24px | 1.25 | セクション見出し         |

### 4-3. アイコンサイズ

| 用途                             | サイズ   | Tailwind             |
| -------------------------------- | -------- | -------------------- |
| インラインアイコン（テキスト内） | 14px     | `size-3.5`           |
| ボタン・リスト行アイコン         | 16px     | `size-4`             |
| カードアイコン                   | 20px     | `size-5`             |
| ウィジェットヘッダアイコン       | 24px     | `size-6`             |
| 大型ランチャーアイコン           | 32〜48px | `size-8` / `size-12` |

### 4-4. 禁止事項

- フォントサイズ 10px 以下の使用禁止（読みにくい）
- `text-[var(--ag-text-faint)]` を 12px 以下で使用禁止（コントラスト不足）
- 色の違いだけで情報を伝えるラベル禁止（アイコン or テキストと組み合わせる）
- **font-size のハードコード禁止 (PH-issue-007)**:
  - `text-[NNpx]` / `text-[NNrem]` 等の Tailwind 任意値クラス禁止
  - `style="font-size: ..."` の inline 直書き禁止
  - 必ず Tailwind default class (`text-xs` 〜 `text-2xl`) または `var(--ag-*)` token を経由
  - 機械検証: `scripts/audit-font-hardcode.sh` (lefthook pre-commit + CI 統合)

---

## 5. インタラクションフィードバック標準

### 5-1. 必須フィードバック

すべてのクリック可能要素は hover/focus/active/disabled の **4 状態すべて** を定義すること。
`disabled` の視覚差分がない実装は NG。

```svelte
<!-- ✅ Good: 4 状態すべて定義 -->
<button
  class="bg-[var(--ag-surface-1)]
         hover:bg-[var(--ag-surface-3)]
         focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]
         active:scale-[0.97]
         disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none"
  {disabled}
>

<!-- ❌ Bad: disabled 状態なし -->
<button class="hover:bg-[var(--ag-surface-3)]">
```

### 5-2. クリック反応

- クリック直後に **80ms 以内** に視覚変化が始まること
- `active:scale-[0.97]` または `active:opacity-80` 等の押し込みフィードバックを推奨
- primary アクションには `active:scale-[0.97]` + クリック SE（`soundStore.soundEnabled` が true の場合）

### 5-3. Ghost ボタン仕様

```svelte
<!-- Ghost ボタン（背景なし、ホバーで薄い背景） -->
<button class="text-[var(--ag-text-secondary)]
               hover:bg-[var(--ag-surface-2)] hover:text-[var(--ag-text-primary)]
               rounded-[var(--ag-radius-button)] px-3 py-1.5
               transition-colors duration-[var(--ag-duration-fast)]
               motion-reduce:transition-none">
```

### 5-4. 発光（Glow）仕様

D&D ドロップゾーンのハイライト等で使用するグロー:

```css
/* ドロップゾーンアクティブ時 */
box-shadow: 0 0 0 2px var(--ag-accent-border), 0 0 12px rgba(34, 211, 238, 0.15);
border-color: var(--ag-accent-border);
```

### 5-5. クリック SE 仕様

```typescript
// Web Audio API インライン生成
// OscillatorNode: type='sine', 800Hz → 400Hz (20ms スイープ)
// GainNode: 0.3 → 0 (60ms decay)
// 総 duration: ~80ms
// デフォルト volume: 0.4

playClick(soundStore.soundVolume);  // soundEnabled チェック後に呼ぶ
```

適用対象:

- `[x]` プライマリボタン確定（ランチャー起動・設定保存）
- `[x]` コマンドパレット実行（Enter / 項目クリック）
- `[ ]` アイテム起動成功（将来実装）
- `[ ]` ウィジェット削除確定（将来実装）

---
