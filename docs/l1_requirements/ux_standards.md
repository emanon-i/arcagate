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

## 6. コンポーネント別「あるべき姿」

### 6-1. Widget

**必須要素**:

- ヘッダ: ウィジェットタイプ名（アイコン + テキスト）
- 設定ボタン（⚙）: 各 widget 内 menu (kebab / WidgetShell `menuItems`) からアクセス
- コンテンツ: スクロール可能（overflow-auto）、高さ fill-available

**ヘッダ layout 仕様** (PH-issue-015、widget が狭くなっても title が icon に被らない):

- 親 `flex` container に `min-w-0 flex-1`
- icon wrapper に `shrink-0` (アイコン領域は固定幅)
- title `<div>` に `min-w-0 flex-1 truncate` (狭くなったら truncate)
- 右側 menu / settings button は `shrink-0`

**list-row layout 仕様** (Widget 内のリスト行 — ExeFolderWatch / FileSearch / Snippet 等):

- `<li>` / row container に `min-w-0`
- icon: `shrink-0` (固定 16px)
- name: `min-w-0 flex-1 truncate` (狭くなったら truncate、icon に被らない)
- suffix (count chip 等): `shrink-0`
- ネストする `<button>` (flex-1 の row 内クリック可能エリア) にも `min-w-0` を継承

**編集モード時の grid-level 操作 UI** (PH-issue-001 で確定、§13 に詳細):

- 編集モード ON で **selection** state を導入
- 非選択 widget: 通常表示、handle / ring 一切なし
- 選択 widget のみ:
  - selection ring: `ring-2 ring-[var(--ag-accent)]`
  - 上端 drag bar (Notion 風 floating chip)
  - 右上 × button (shadcn ghost-icon、hover で `bg-destructive`)
  - 8 方向 resize handles (corner chip + edge strip)
- Delete / Backspace キー: 選択 widget で削除確認 dialog (入力欄 focus 中は無効)

**状態**:

- 通常: `border-[var(--ag-border)]`
- 編集モード選択: `ring-2 ring-[var(--ag-accent)]`
- D&D ドラッグ中: `opacity-50 cursor-grabbing`

**禁止**:

- コンテンツ無しの白紙 Widget は空状態テキストを表示すること
- ヘッダなし（何の Widget か分からない状態）

**fluid sizing 仕様** (PH-issue-021、ClockWidget 等の単一表示 widget):

- 親 div に `@container` + `overflow-hidden` (scrollbar 抑止)
- font-size を container query で段階的に拡大: `text-xl @xs:text-2xl @sm:text-3xl @md:text-4xl @lg:text-5xl`
- 副次情報 (日付 / 曜日 等) は `hidden @xs:inline` で 1×1 では非表示にし、widget が広くなったら表示
- 1×1 (320×180px 想定) で scrollbar が出ないことが受け入れ条件

**config 変更時の派生 state 取り扱い** (PH-issue-017):

- `$effect` で config 派生の async 取得を行う場合、`effect` 開始時に派生 state (entries / results 等) を**即時 clear** する → 旧 path の結果が残らない
- 同時に `requestId` (単純なカウンタ or UUID) を発行し、async 結果を反映する前に「自分が最新 requestId か」を check (stale response 破棄)
- 検索 / scan widget は全てこのパターンに従う (ExeFolderWatch / FileSearch / 他)

**Item 参照 widget の cascade 仕様** (PH-issue-006):

- Item を参照する widget (Item / Favorites / Recent / Projects 等) は `widget.config` JSON に `item_id: string` または `item_ids: string[]` を保存
- Library で item 削除時、Rust 側 (`workspace_repository::cascade_remove_item_from_widgets`) が**全 widget config を scan して該当 ID を除去**
  - `item_id == X` なら field 削除
  - `item_ids` 配列なら filter で該当 ID 除去 (空配列も維持、UI 側で「item 無し」表示)
- 削除確認 dialog は `cmd_count_item_references(id)` で参照 widget 数を取得して表示 (P2 失敗前提、影響範囲を user に明示)
- orphan ID は DB に残さない (engineering-principles §3 データ整合性)

**グリッドセル base size 仕様** (PH-issue-004):

- BASE_W = 240px / BASE_H = 135px (16:9、zoom 100%)
- zoom 範囲 50〜200%: 50% で 120×67 / 200% で 480×270
- 1280×800 viewport で 5×5=25 セル表示可能 (旧 320×180 base では 4×4=16 セル)
- 実装: `src/lib/state/widget-zoom.svelte.ts` BASE_W / BASE_H 定数
- ClockWidget 等の fluid sizing は container query で base 縮小に追従 (PH-issue-021)

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

### 9-1. flex item の truncate 必須セット (PH-issue-016)

flex 配下で truncate を実効化するには **`flex-1` + `truncate` + `min-w-0`** の 3 点セットが必須。
default の `min-width: auto` が overflow を阻害するため、`min-w-0` 不在の truncate は機能しない。

機械検証: `scripts/audit-text-overflow.sh` (lefthook pre-commit + CI 統合)。
同一 class 文字列内で `flex-1` + `truncate` を持つ要素に `min-w-0` が無ければ violation。

## 10. スクロール・レイアウトルール

スクロール可能なコンテナには `[scrollbar-gutter:stable]` を付与し、スクロールバーとコンテンツの重なりを防ぐ。

### Workspace widget の横スクロール禁止 (PH-issue-012)

**`src/lib/widgets/` 配下の widget では `overflow-x-auto` / `overflow-x-scroll` 禁止**。
text は `truncate` / `line-clamp` で吸収する (横 scrollbar は noise、§9 truncate ルール参照)。
WidgetShell content area は `overflow-x-hidden overflow-y-auto` で確定。

機械検証: `scripts/audit-no-horizontal-scrollbar.sh` (lefthook pre-commit + CI 統合)。

例外: Workspace Canvas / Library グリッド等の大枠コンテナは scope 外 (横 pan/scroll は意図的)。

| コンポーネント           | 適用箇所                                        |
| ------------------------ | ----------------------------------------------- |
| `LibraryLayout.svelte`   | sidebar-wrapper / main-wrapper / detail-wrapper |
| `WorkspaceLayout.svelte` | ワークスペースコンテナ                          |
| `WidgetShell.svelte`     | content scroll-area (PH-issue-014)              |
| `SettingsPanel.svelte`   | 右ペイン content area (PH-issue-014)            |
| ウィジェット内リスト     | `overflow-y-auto` を持つコンテナすべて          |

### scrollbar-gutter 適用 scope (PH-issue-014)

**inner scroll container のみ**。root / header / 静的 panel には適用しない (旧 PH-489 の root 全 stable は密度低下を招いた、scope 限定)。

判定基準: `overflow-y-(auto|scroll)` を持つ要素にのみ `[scrollbar-gutter:stable]` を付与。それ以外には付けない。

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

#### 機械化（batch-74）

- `scripts/audit-labels.sh`: aria-label / 表示テキストに Lucide アイコン名（Star / Plus / Trash / Settings 等）や記号（★ ＋ × 等）が直書きされていないか grep 検出
- lefthook pre-commit: `label-audit` step で staged ファイルに対し実行、違反で commit 阻止
- CI: `Label audit (UX 一貫性)` step で全コードベースを検証、違反で PR fail
- セルフテスト: `scripts/test-audit-labels.sh` で fixture（pass / fail）を流して exit code を検証

---

## 13. Workspace Canvas 編集 UX 規約 (PH-issue-002 で Obsidian Canvas 完全実装)

### 編集モード撤廃 (即時保存)

**Workspace は常時編集可能**。旧「編集モード」toggle は廃止。すべての pointer-up / config 変更で即 IPC + DB 反映。
誤操作回復は **Undo / Redo** で行う (P2 失敗は前提で立て直し)。

### Widget 同士は重ならない (PH-issue-003)

**全経路で overlap reject、auto-rearrange / (0,0) fallback 禁止**。

| 経路                       | 動作                                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------- |
| panel click 追加           | `findFreePosition` で空き探索、null なら toast「空きスペースがありません」+ 追加せず              |
| drag 追加 (sidebar → 座標) | `wouldOverlapAt(x, y)` で overlap → toast「他のウィジェットと重なるため配置できません」+ 追加せず |
| 移動 (drag bar)            | overlap → toast「他のウィジェットと重なるため移動できません」+ 元位置維持                         |
| リサイズ (handle)          | `clampResizeForOverlap` で rubber-band (重ならない最大に丸める)                                   |

実装: `src/lib/utils/widget-grid.ts` の `wouldOverlapAt` / `findFreePosition` (null 返却版) を全経路が呼ぶ。
`src/lib/state/workspace.svelte.ts` の `addWidget` / `addWidgetAt` / `moveWidget` がそれぞれ overlap check して toast 経由で fail。

### Obsidian 入力マッピング (全装備)

| 入力                            | 動作                                                         | 実装                                                                  |
| ------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------- |
| マウス wheel (上下)             | 縦 scroll (pan Y)                                            | ブラウザ標準                                                          |
| **Shift + wheel**               | 横 scroll (pan X)                                            | `useWidgetZoom` の wheel handler                                      |
| 中ボタン drag                   | 自由 pan (XY 同時)                                           | `WorkspaceLayout` の pointer handler                                  |
| Space + 左 drag                 | 自由 pan (XY 同時)                                           | `WorkspaceLayout` の keydown + pointer handler、入力欄 focus 中は無効 |
| **Ctrl + wheel**                | zoom (50〜200%、±10)                                         | `useWidgetZoom`                                                       |
| **Ctrl + 0**                    | zoom 100% リセット                                           | `WorkspaceLayout` keydown + toolbar button                            |
| **Ctrl + Shift + 1**            | Fit to content (全 widget が画面に収まる zoom 自動計算)      | `WorkspaceLayout` keydown + toolbar button                            |
| **Ctrl + Z**                    | Undo                                                         | `WorkspaceLayout` keydown + toolbar button                            |
| **Ctrl + Shift + Z / Ctrl + Y** | Redo                                                         | 同上                                                                  |
| Delete / Backspace              | 選択 widget 削除確認 (入力欄 focus 中は無効)                 | 既存                                                                  |
| Esc                             | 選択解除                                                     | 新規                                                                  |
| 通常モード scrollbar            | 表示 (`canvas-edit-mode` class は常時 active、scroll は標準) | —                                                                     |

`page.mouse` 直接呼びは禁止 (lessons.md batch-16、PointerEvent 直接 dispatch を使う)。

### Undo / Redo system (5 種 history、50 件 ring buffer)

**HistoryEntry** 種別:

| 種別     | before                | after         | undo 動作         | redo 動作      |
| -------- | --------------------- | ------------- | ----------------- | -------------- |
| `add`    | —                     | rect + config | remove            | add            |
| `remove` | rect + config         | —             | add (新 widgetId) | remove         |
| `move`   | rect                  | rect          | rect 戻す         | rect 進める    |
| `resize` | rect                  | rect          | rect 戻す         | rect 進める    |
| `config` | config (string\|null) | config        | before に戻す     | after に進める |

50 件超で古いものから drop。undo 後の新 mutation で redo stack を破棄 (linear history)。

実装: `src/lib/state/workspace-history.svelte.ts` (PH-issue-002 で新設)。

### dotted grid 背景 (常時表示)

```css
background-image:
  radial-gradient(circle, rgba(128,128,128,0.22) 1.5px, transparent 1.5px),
  linear-gradient(180deg, var(--ag-surface-0) 0%, var(--ag-surface-page) 100%);
background-size: 24px 24px, 100% 100%;
```

`canvas-edit-mode` class は常時付与、編集モード撤廃で「編集モード時のみ表示」概念は廃止。

### 右下 floating toolbar

Workspace 右下に固定:

- Undo / Redo button (history 空時 disabled)
- Reset (Ctrl+0)
- Zoom % 表示 (`{configStore.widgetZoom}%`、tabular-nums)
- Fit (Ctrl+Shift+1)

各 button: ghost-icon、hover で `bg-surface-2`、focus ring 必須、aria-label 機能名。

### ウィジェットリサイズハンドル（PH-issue-001 で完成）

選択 widget のみ表示 (非選択 widget には出ない、P11 装飾は対象を邪魔しない)。

**8 方向 完成 (n/s/e/w + 4 corner)**:

| ハンドル         | cursor      | 軸          | aria-label                   |
| ---------------- | ----------- | ----------- | ---------------------------- |
| n (上辺)         | ns-resize   | height のみ | ウィジェットの上辺を変更     |
| s (下辺)         | ns-resize   | height のみ | ウィジェットの高さを変更     |
| e (右辺)         | ew-resize   | width のみ  | ウィジェットの幅を変更       |
| w (左辺)         | ew-resize   | width のみ  | ウィジェットの左辺を変更     |
| nw (左上 corner) | nwse-resize | 両軸        | ウィジェットの左上を変更     |
| ne (右上 corner) | nesw-resize | 両軸        | ウィジェットの右上を変更     |
| sw (左下 corner) | nesw-resize | 両軸        | ウィジェットの左下を変更     |
| se (右下 corner) | nwse-resize | 両軸        | ウィジェットの幅と高さを変更 |

実装: `src/lib/components/arcagate/workspace/WidgetHandles.svelte` (PH-issue-001 で新設)。
edge は細いストリップ (1.5px、hover で半透明 accent)、corner は 12×12 chip (hover で scale-125 + accent border)。

### ウィジェット削除 / 選択 / 移動

- 編集モード ON で **selection** state を導入
- widget click → 選択 (selectedWidgetId 更新)
- canvas (空白) click → 選択解除
- 選択 widget のみ:
  - selection ring (`ring-2 ring-[var(--ag-accent)]`)
  - 上端 drag bar (Notion 風 floating chip、`-top-3 left-1/2`、cursor-grab、`GripHorizontal` icon)
  - 右上 × button (`-right-3 -top-3 floating`、shadcn ghost-icon、hover で `bg-destructive` + white text、`X` icon)
  - 8 方向 resize handles
- 削除動線:
  - **Delete / Backspace キー**: 入力欄 focus 中は無効、削除確認 dialog 経由
  - **× button click**: 同経路
  - 削除確認 dialog は batch-16 の getByRole('dialog') パターン踏襲

### ❌ 過去採用していて棄却した実装パターン (再発防止)

| パターン                                                                | 棄却理由                                   | 引用元                          |
| ----------------------------------------------------------------------- | ------------------------------------------ | ------------------------------- |
| 編集モード ON 時に **全 widget で常時可視 chip handle + delete button** | P11 装飾は対象を邪魔しない違反、認知ノイズ | `desktop_ui_ux_agent_rules` P11 |
| **`rounded-full bg-destructive/80` 派手丸**の delete button             | 「過度に派手 NG」「よく磨かれた工具」違反  | `arcagate-visual-language.md`   |
| 選択状態を **box-shadow inline style で margin 表現**、ring なし        | 選択状態が認識困難、§6-1 規格違反          | `ux_standards §6-1`             |

これらは PH-issue-001 で全廃。`scripts/audit-handle-style.sh` で再発を機械検出。

---

## 14. Window Translucency 規格 (PH-issue-008)

- main window: `tauri.conf.json` の `windowEffects.effects: ["mica"]` で Windows 11 Mica を default 適用
- Windows 11 → Mica effective、Win10 / 他 OS → no-op (Tauri が backend で safe skip)
- `html / body` は `background: transparent`、app root container (surface-0 系) で塗る → Mica は外周 / round corner / 影部分にのみ漏れる
- runtime IPC 切替 (Mica / Acrylic / 不透明) は別 plan、現状は Mica default 1 値のみ

## 15. Wallpaper 規格 (PH-issue-009)

- per-workspace 壁紙: `workspaces.wallpaper_path TEXT` (DB 保存、`<app_data_dir>/wallpapers/<uuid>.<ext>`)
- 画像形式: png / jpg / jpeg / webp (ext で validation、それ以外は `cmd_save_wallpaper_file` で reject)
- opacity 0.0..1.0 (default 0.6)、blur 0..40px (default 0)、両方 service 側で clamp
- WorkspaceLayout の `absolute inset-0` 層に `background-image: url(convertFileSrc(path))` を適用、widget content より下 (z-0)
- `motion-reduce:!filter-none` で Reduced Motion 時 blur 無効化 (P11 / Reduced Motion 標準)
- asset protocol scope: `tauri.conf.json` `assetProtocol.scope` に `$APPDATA/wallpapers/**` 追加
- Library 共通 default は別 plan (本 PR は per-workspace のみ実装)

---

## 参照

- `docs/l1_requirements/ux_design_vision.md` — UX ビジョン・ゲーム UI 原則
- `docs/l1_requirements/design_system_architecture.md` — トークン階層・技術設計
- `docs/l0_ideas/arcagate-visual-language.md` — ムードボード・視覚方向性
- `docs/desktop_ui_ux_agent_rules.md` — エージェント向け UX 実装原則

---

## UX Research 統合（batch-91 PH-414）

`docs/l1_requirements/ux-research/` 配下に業界標準リサーチを集約。本セクションは要約 + 参照導線。

### Nielsen 10 Heuristics（適用必須）

詳細: [`ux-research/industry-standards.md §1`](ux-research/industry-standards.md)

各 PR / 機能追加で以下 10 項目を自問:

1. Visibility of System Status（フィードバック適切性）
2. Match Between System and Real World（用語整合）
3. User Control and Freedom（緊急脱出 / undo）
4. Consistency and Standards（業界慣行整合）
5. Error Prevention（事前防止）
6. Recognition Rather than Recall（視認可能）
7. Flexibility and Efficiency of Use（power user / casual 両立）
8. Aesthetic and Minimalist Design（不要排除）
9. Help Users Recognize, Diagnose, Recover from Errors（エラー復旧導線）
10. Help and Documentation（in-app ヘルプ）

batch-92 で 10 ユーザケース × 10 ヒューリスティック = 100 マスチェックリストで HE 実施予定。

### 数値ベンチマーク（業界標準）

詳細: [`ux-research/industry-standards.md §5`](ux-research/industry-standards.md)

| 指標                          | Arcagate 目標 | 業界標準                                                     |
| ----------------------------- | ------------- | ------------------------------------------------------------ |
| ホットキー → パレット表示 P95 | < 100ms       | Spotlight: 即時 / Raycast: ~100ms                            |
| 検索結果表示 P95              | < 80ms        | Raycast: <50ms / Alfred: ms 単位                             |
| アニメーション duration       | 100-500ms     | Material 3: トグル 100ms / ボタン 300-500ms / 一般 400-500ms |
| idle メモリ                   | < 100MB       | Raycast: ~80MB / Alfred: 軽量                                |
| exe size                      | < 20MB        | Tauri 系 10-50MB                                             |

実測は `scripts/bench/startup.ps1` / `scripts/bench/idle-memory.ps1` で取得（PH-402 deferred）。

### Heuristic Evaluation + Cognitive Walkthrough 適用

詳細: [`ux-research/cedec-papers.md`](ux-research/cedec-papers.md)

- HE: agent が 3-5 視点で各 UI を評価、Nielsen 10 に照合 + severity 付け
- CW: 「初めて使うユーザ」視点で 4 ステップを逐次確認

両手法併用で「catastrophic + major」issue を網羅（2025 比較研究）。

### Codex セカンドオピニオン（Rule C）

詳細: [`ux-research/codex-review.md`](ux-research/codex-review.md)

大型決定 / 設計案には `run-codex` skill で Codex に相談、結果を採用 / 却下を理由付きで記録。

### batch-92 適用フロー

1. 起動 P95 / idle memory 実測
2. 10 ケース × HE + CW 再監査（信頼度 4/5 目標）
3. Codex 指摘の micro/medium 修正
4. macro 再設計提案（Rule A、ユーザ承認後）
