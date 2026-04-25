# Arcagate UX 標準

作成: 2026-04-23 / batch-32 (PH-146)

> この文書は「検証可能な実装基準」である。ビジョン（`ux_design_vision.md`）や構造設計
> （`design_system_architecture.md`）の方向性を、具体的な数値・条件・コード例に落とす。
> バッチ受け入れ判定・PR レビュー・テスト設計の基準として使うこと。

---

## 1. パフォーマンスメトリクス

| 指標                     | 目標値     | 測定方法                                         |
| ------------------------ | ---------- | ------------------------------------------------ |
| アプリ起動時間 P50       | ≤ 1,500ms  | Tauri `app_ready` イベントまでの elapsed         |
| アプリ起動時間 P95       | ≤ 2,500ms  | 同上（低スペック PC 想定）                       |
| パレット表示 P95         | ≤ 120ms    | ホットキー押下 → ウィンドウ可視化                |
| アイテム起動 P95         | ≤ 200ms    | Enter/ダブルクリック → プロセス起動開始          |
| idle メモリ上限          | ≤ 120MB    | タスクマネージャ（プライベートワーキングセット） |
| アクティブ CPU (idle 時) | ≤ 1%       | タスクマネージャ平均（画面静止・無操作）         |
| E2E テスト通過率         | 100%（PR） | CI `e2e` ジョブ @smoke タグ                      |

### 判定基準

- 起動時間・パレット応答は「体感で速い」水準。ストップウォッチで測れる。
- idle CPU が継続的に 1% を超える場合は常時アニメーションやポーリングを疑う。
- E2E は @smoke が全通過であれば PR マージ可。@nightly はリリース前に確認。

---

## 2. モーション標準

### 2-1. Duration テーブル

| トークン                | 値    | 用途                                     |
| ----------------------- | ----- | ---------------------------------------- |
| `--ag-duration-instant` | 80ms  | ドラッグフィードバック・即応が必要な操作 |
| `--ag-duration-fast`    | 120ms | ホバー・フォーカス・リスト行ハイライト   |
| `--ag-duration-normal`  | 200ms | パネル出現/消去・ダイアログ・タブ切替    |
| `--ag-duration-slow`    | 300ms | テーマ切替・ページトランジション         |

**原則**: 100ms 以内に視覚的な反応が始まること（入力から最初の変化まで）。

### 2-2. Easing テーブル

| トークン           | 値                                     | 用途                                   |
| ------------------ | -------------------------------------- | -------------------------------------- |
| `--ag-ease-in-out` | `cubic-bezier(0.25, 0.46, 0.45, 0.94)` | ホバー・パネル・ダイアログ（統一基準） |
| `--ag-ease-out`    | `cubic-bezier(0.0, 0, 0.2, 1)`         | 要素の出現（すっと現れる）             |
| `--ag-ease-in`     | `cubic-bezier(0.4, 0, 1, 1)`           | 要素の消去（すっと消える）             |
| `--ag-ease-bounce` | `cubic-bezier(0.34, 1.56, 0.64, 1)`    | ドロップ成功・完了フィードバック       |

**統一 easing**: `--ag-ease-in-out` が Arcagate の「中割」スタイル。
動き始めと終わりが緩やかにつながる。ドラッグのみ `linear`（即応性優先）。

### 2-3. Reduced Motion 対応

```css
@media (prefers-reduced-motion: reduce) {
  :root {
    --ag-duration-instant: 0ms;
    --ag-duration-fast: 0ms;
    --ag-duration-normal: 0ms;
    --ag-duration-slow: 0ms;
  }
}
```

**実装ルール**: すべてのトランジション要素に `motion-reduce:transition-none` を付与する。
CSS 変数が 0ms になることで同等の効果があるが、クラス明示で意図を伝える。

### 2-4. コンポーネント別モーション仕様

| コンポーネント     | 操作  | duration                | easing             | 追加変化                  |
| ------------------ | ----- | ----------------------- | ------------------ | ------------------------- |
| Button             | hover | `--ag-duration-fast`    | `--ag-ease-out`    | bg opacity +1 段階        |
| Button             | click | `--ag-duration-instant` | linear             | scale 0.97                |
| Card / List item   | hover | `--ag-duration-fast`    | `--ag-ease-out`    | bg opacity +1 段階        |
| Dialog             | 出現  | `--ag-duration-normal`  | `--ag-ease-out`    | scale 0.96→1 + fade       |
| Dialog             | 消去  | `--ag-duration-fast`    | `--ag-ease-in`     | scale 1→0.96 + fade       |
| Toast              | 出現  | `--ag-duration-normal`  | `--ag-ease-out`    | translateY -100%→0 + fade |
| Toast              | 消去  | `--ag-duration-fast`    | `--ag-ease-in`     | translateX 0→100% + fade  |
| Palette            | 出現  | `--ag-duration-normal`  | `--ag-ease-out`    | scale 0.98→1 + fade       |
| D&D ドロップゾーン | over  | `--ag-duration-fast`    | linear             | border-accent + glow      |
| D&D 成功           | drop  | `--ag-duration-fast`    | `--ag-ease-bounce` | scale 1.02→1              |
| Tab 切替           | click | `--ag-duration-fast`    | `--ag-ease-in-out` | content fade              |
| サイドバー開閉     | click | `--ag-duration-fast`    | `--ag-ease-in-out` | width slide               |

### 2-5. コード例

```svelte
<!-- ✅ Good: CSS 変数 + motion-reduce -->
<button
  class="transition-[background-color,transform]
         duration-[var(--ag-duration-fast)]
         hover:bg-[var(--ag-surface-3)]
         active:scale-[0.97]
         motion-reduce:transition-none"
>

<!-- ❌ Bad: ハードコード duration -->
<button class="transition-colors duration-150">
```

---

## 3. 色・コントラスト標準

### 3-1. WCAG 準拠目標

| 用途                                | 基準     | コントラスト比 |
| ----------------------------------- | -------- | -------------- |
| 本文テキスト（14px 以上）           | WCAG AA  | ≥ 4.5:1        |
| 大テキスト（18px / Bold 14px 以上） | WCAG AA  | ≥ 3:1          |
| アイコン・UI コンポーネント         | WCAG AA  | ≥ 3:1          |
| 重要情報テキスト                    | WCAG AAA | ≥ 7:1          |

### 3-2. カラートークン対応表

| トークン              | ダーク値                 | 最低コントラスト比（on surface-page）   |
| --------------------- | ------------------------ | --------------------------------------- |
| `--ag-text-primary`   | `rgba(255,255,255,0.95)` | ≈ 18:1 ✅                               |
| `--ag-text-secondary` | `rgba(255,255,255,0.65)` | ≈ 9:1 ✅                                |
| `--ag-text-muted`     | `rgba(255,255,255,0.45)` | ≈ 5.5:1 ✅                              |
| `--ag-text-faint`     | `rgba(255,255,255,0.35)` | ≈ 4.2:1 ⚠（AA ギリギリ。12px 以下禁止） |
| `--ag-accent-text`    | `#a5f3fc`                | ≈ 9:1 ✅                                |
| `--ag-error-text`     | `#fca5a5`                | ≈ 6.5:1 ✅                              |
| `--ag-warm-text`      | `#fde68a`                | ≈ 10:1 ✅                               |
| `--ag-success-text`   | `#a7f3d0`                | ≈ 9:1 ✅                                |

### 3-3. フォーカスリング仕様

```css
/* 標準フォーカスリング */
:focus-visible {
  outline: 2px solid var(--ag-accent);
  outline-offset: 2px;
}
```

- **色**: `--ag-accent`（シアン）
- **幅**: 2px
- **offset**: 2px（要素の外側に隙間）
- `:focus` ではなく `:focus-visible` を使う（マウス操作でリングを出さない）
- カスタムコンポーネントで outline を消す場合は代替の視覚インジケータを必ず提供する

### 3-4. 状態別色差分ルール

同一コンポーネントの状態遷移は以下の差分を持つこと:

| 状態     | 背景                      | ボーダー                    | テキスト            |
| -------- | ------------------------- | --------------------------- | ------------------- |
| default  | `surface-0` / `surface-1` | `--ag-border`               | `--ag-text-primary` |
| hover    | `surface-2` / `surface-3` | `--ag-border-hover`         | `--ag-text-primary` |
| focus    | `surface-2`               | `--ag-accent-border`        | `--ag-text-primary` |
| active   | `surface-4`               | `--ag-accent-border`        | `--ag-text-primary` |
| disabled | `surface-0`（変化なし）   | `--ag-border`               | `--ag-text-faint`   |
| selected | `accent-active-bg`        | `--ag-accent-active-border` | `--ag-accent-text`  |

---

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

## 6. コンポーネント別「あるべき姿」

### 6-1. Widget

**必須要素**:

- ヘッダ: ウィジェットタイプ名（アイコン + テキスト）
- 編集モード時: 設定ボタン（⚙）+ 削除ボタン（🗑）が可視
- コンテンツ: スクロール可能（overflow-auto）、高さ fill-available

**状態**:

- 通常: `border-[var(--ag-border)]`
- 編集モード選択: `ring-2 ring-[var(--ag-accent)]`
- D&D ドラッグ中: `opacity-50 cursor-grabbing`

**禁止**:

- コンテンツ無しの白紙 Widget は空状態テキストを表示すること
- ヘッダなし（何の Widget か分からない状態）

### 6-2. Palette

**必須要素**:

- 検索バー: オートフォーカス、`/` キーでフォーカス
- 結果リスト: キーボードナビゲーション（↑↓ + Enter）
- クイックコンテキスト: 現在のタグ・モードを表示
- フッタ: ヒントバー（`Enter` 実行・`Esc` 閉じる）

**アニメーション**:

- 出現: `scale 0.98→1 + fade`, `--ag-duration-normal`
- 消去: `scale 1→0.97 + fade`, `--ag-duration-fast`

**禁止**:

- 結果が 0 件でも空白だけ表示（「結果なし」テキスト必須）
- キーボードで操作できない状態

### 6-3. Dialog

**必須要素**:

- タイトル（何のダイアログか）
- 閉じるボタン（× アイコン）+ `Esc` キー対応
- アクションボタン: 最低限 1 つ（primary action）+ キャンセル

**アニメーション**:

- 出現: `scale 0.96→1 + fade`, `--ag-duration-normal`
- Backdrop: `bg-black/50 backdrop-blur-sm`

**禁止**:

- Esc で閉じられないダイアログ
- 閉じる手段が 1 つしかないダイアログ

### 6-4. Button

**バリアント仕様**:

| バリアント  | 背景             | テキスト              | ボーダー            | 用途             |
| ----------- | ---------------- | --------------------- | ------------------- | ---------------- |
| primary     | `--ag-accent`    | `#090b10`（ダーク時） | なし                | 主要アクション   |
| secondary   | `--ag-surface-1` | `--ag-text-primary`   | `--ag-border`       | 補助アクション   |
| ghost       | transparent      | `--ag-text-secondary` | なし                | 低優先アクション |
| destructive | `--ag-error-bg`  | `--ag-error-text`     | `--ag-error-border` | 削除・破壊       |

---

## 7. Do / Don't リスト

### ✅ Do

- CSS カスタムプロパティ（`--ag-*`）を経由して色・スペーシング・モーションを指定する
- トランジションには必ず `motion-reduce:transition-none` を付与する
- focus-visible リングを全インタラクティブ要素に確保する
- hover/focus/active/disabled の 4 状態を必ず定義する
- ダイアログ・パネルに必ず `Esc` で閉じる機能を付ける
- アイコンのみのボタンに `aria-label` を付ける
- 空状態に「何もない」理由と次の操作を示すテキストを置く

### ❌ Don't

- コンポーネントに色コードをハードコードする（`#ffffff`、`rgba(...)` を直書き）
- Tailwind の `duration-100` / `duration-150` 等をそのまま使う（CSS 変数を使う）
- `opacity-0` だけで「非表示」を実装する（`display: none` または `visibility: hidden` を使う）
- `disabled` 状態の視覚差分なしで実装する
- フォーカスリングを削除する（`outline: none` + 代替なし）
- コントラスト比 4.5:1 未満のテキストを使う
- `text-faint` を 12px 以下で使う
- 常時アニメーション・常時光るエフェクトを追加する（CPU 使用率・疲労感）
- `prefers-reduced-motion` を無視する

---

## 8. バッチ受け入れチェックリスト

各バッチ PR のレビュー前に以下を確認すること。
**1 つでも ✗ なら PR マージ禁止**（品質基準として機能させる）。

### 必須チェック

| # | チェック項目                                                  | 確認方法                                   |
| - | ------------------------------------------------------------- | ------------------------------------------ |
| 1 | CSS トークン直書き禁止（新規 `#hex` / `rgba()` なし）         | `git diff` で色コードを目視確認            |
| 2 | `prefers-reduced-motion` 対応済み                             | `motion-reduce:transition-none` の存在確認 |
| 3 | focus ring 可視（`focus-visible:ring-*` or `:focus-visible`） | キーボードで Tab 移動して確認              |
| 4 | キーボード操作可（主要フローが Tab + Enter + Esc で完結）     | キーボードのみで操作してみる               |
| 5 | hover/focus/active/disabled 全状態定義済み                    | コードレビューまたは目視確認               |
| 6 | コントラスト比 ≥ 4.5:1（本文テキスト）                        | DevTools の accessibility パネルで確認     |
| 7 | `pnpm verify` 全通過                                          | CI ログ確認                                |

### 推奨チェック（違反でも merge 可だが次バッチで修正）

| #  | チェック項目                           | 確認方法               |
| -- | -------------------------------------- | ---------------------- |
| 8  | Tailwind ハードコード duration なし    | `git diff` 目視        |
| 9  | アイコンのみボタンに `aria-label` あり | コードレビュー         |
| 10 | 空状態テキストあり（コンテンツゼロ時） | 手動操作でゼロ件を確認 |
| 11 | 破壊的操作に確認ダイアログあり         | 手動操作               |

---

## 9. テキスト truncate ルール

テキストが親コンテナを超える場合は以下のルールに従う。

| パターン | Tailwind クラス | 用途                                         |
| -------- | --------------- | -------------------------------------------- |
| 1行省略  | `truncate`      | ラベル・タイトル・パス表示（一般）           |
| 2行省略  | `line-clamp-2`  | カード説明文・メタ情報など複数行が必要な場合 |
| 6行省略  | `line-clamp-6`  | クイックノート・長文プレビュー               |

**原則:**

- 省略されたテキストには `title={value}` 属性を付けてホバーで全文表示
- `line-clamp-*` と `truncate` の混在禁止（親コンテナ単位で統一）
- 必要な場合は `break-all` を追加するが、原則は `break-words`

## 10. スクロール・レイアウトルール

スクロール可能なコンテナには `[scrollbar-gutter:stable]` を付与し、スクロールバーとコンテンツの重なりを防ぐ。

| コンポーネント           | 適用箇所                                        |
| ------------------------ | ----------------------------------------------- |
| `LibraryLayout.svelte`   | sidebar-wrapper / main-wrapper / detail-wrapper |
| `WorkspaceLayout.svelte` | ワークスペースコンテナ                          |
| ウィジェット内リスト     | `overflow-y-auto` を持つコンテナすべて          |

---

## 11. アイテムカードサイズプリセット

Library のグリッド表示で使用するサイズプリセット。Settings > Library から変更可能。
**4:3 アスペクト比固定**、カード width のみが変動、gap は 16px 固定。

| サイズ | width | height (4:3) |
| ------ | ----- | ------------ |
| S      | 144px | 108px        |
| M      | 192px | 144px        |
| L      | 256px | 192px        |

- CSS 変数 `--ag-card-w-{s,m,l}` で定義、`--ag-card-gap = 1rem` 固定
- グリッド: `repeat(auto-fill, var(--ag-card-w))` + `justify-content: center`
- DB `config` の `item_size` キーで永続化、デフォルト `M`
- ウィジェット内リストのアイコンも S/M/L に追従

## 12. Library 操作 UX 規約 (batch-67)

### お気に入りボタン

- **アイコン + テキストラベル「お気に入り」**（"星" / "★" / "☆" は禁止）
- `<Star fill={isStarred ? 'currentColor' : 'none'} />` で塗り/枠の状態切替
- aria-label: 「お気に入りに追加」/「お気に入りを解除」（機能ベース）

### タグ追加 UI

- 「+ タグを追加」ボタンで明示
- ドロップダウン候補リストで選択、未割当タグのみ表示
- 矢印キー / Esc で操作可能

### 可視/不可視切替

- LibraryDetailPanel の「ライブラリで非表示」チェックボックス
- 説明 hint:「非表示にすると検索結果から除外されます。残したまま隠せます。」
- ON で `is_enabled = false`、LibraryCard が grayscale + 検索除外

### 左パネル 4 セクション

1. ライブラリ全体（すべて + お気に入り）
2. タイプ（exe / url / folder / script / command）
3. ワークスペース（sys-ws-* タグ）
4. ユーザータグ

各セクション間に `border-t` 罫線、`expanded` 時は uppercase 見出し。

### per-card 背景・文字 override

- DB `items.card_override_json` で per-card 上書き保存
- `null` = global default（`configStore.libraryCard`）
- LibraryCard で `JSON.parse + shallow merge` 適用
- LibraryDetailPanel に「グローバル設定に戻す」ボタン

### 背景なしモード時のアイコン rendering

- fill / image モード: `drop-shadow-lg` で立体感
- none モード: `drop-shadow-sm` 弱化 + サイズ +2 段階上げ（artMap 柔らかいグラデで edge ぼやけ防止）

### ラベル原則（全画面）

- ラベルはアイコン名ではなく機能 / 状態 / アクションを書く（CLAUDE.md / desktop_ui_ux_agent_rules.md P4 補足）
- 同じ機能には同じアイコン + 同じラベル（`src/lib/nav-items.ts` 経由）
- 1 つの不整合を見つけたら横展開で全画面チェック

---

## 参照

- `docs/l1_requirements/ux_design_vision.md` — UX ビジョン・ゲーム UI 原則
- `docs/l1_requirements/design_system_architecture.md` — トークン階層・技術設計
- `docs/l0_ideas/arcagate-visual-language.md` — ムードボード・視覚方向性
- `docs/desktop_ui_ux_agent_rules.md` — エージェント向け UX 実装原則
