# Arcagate UX 標準

> 検証可能な実装基準。`ux-design.md` (l0) のビジョン / `design-system.md` の構造設計を、具体的な数値・条件・コード例に落とす。バッチ受け入れ判定 / PR レビュー / テスト設計の基準。

200 行制約のため 6 part 分割:

- 本書: §1-3 (perf / motion / color)
- [Part 2 §4-5 spacing/interaction](ux-standards-part-2-spacing.md)
- [Part 3 §6 components](ux-standards-part-3-components.md)
- [Part 4 §7-12 checklists/layout](ux-standards-part-4-checklists.md)
- [Part 5 §13 workspace](ux-standards-part-5-workspace.md)
- [Part 6 §14-15 + ref + research](ux-standards-part-6-research.md)

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
