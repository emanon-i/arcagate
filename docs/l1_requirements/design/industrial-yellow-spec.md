# Industrial Yellow Design Spec

**Status**: spec / 実装着手 OK (L2-A の前提)
**Date**: 2026-05-04
**Predecessor**: [design-direction.md](../library-overhaul/design-direction.md) §0.2 / [design_system_architecture.md](../design_system_architecture.md) / [ux_standards.md](../ux_standards.md) §3 (色 / コントラスト)

## 1. 目的 / 適用範囲

Library overhaul L2 以降で **default の visual language**。Workspace / palette / dialog 等は段階移行 (L2-A は Library 可視部 3 component 限定で smoke、以降の PR で範囲拡大)。

## 2. 4 色 + state palette

### 2.1 primitive layer (新規追加、直接 component で使わない)

```css
/* Industrial Yellow (蛍光イエロー) — primary action / selected / 重要通知 */
--prim-il-yellow-50:  #FFFBE0;
--prim-il-yellow-300: #FFF066;
--prim-il-yellow-500: #FFE600;  /* base */
--prim-il-yellow-600: #E6CF00;
--prim-il-yellow-900: #4D4500;

/* Paper (白パネル) — 詳細 pane / カード背景 */
--prim-il-paper:      #F1F1EB;
--prim-il-paper-dim:  #E3E3DD;

/* Ink (黒地) — ページ背景 / 重 typography */
--prim-il-ink-50:     #2A2B2A;
--prim-il-ink-300:    #1A1B1A;
--prim-il-ink-500:    #050605;  /* base */

/* Orange (オレンジ菱形) — 通知 / 注目マーカー */
--prim-il-orange-300: #FFB266;
--prim-il-orange-500: #FF7A00;
--prim-il-orange-700: #B25500;
```

### 2.2 semantic layer (component 使用可、`--ag-il-*` namespace)

```css
/* Surface hierarchy (Industrial mode) */
--ag-il-page:        var(--prim-il-ink-500);    /* 全体背景 */
--ag-il-paper:       var(--prim-il-paper);      /* card / pane */
--ag-il-paper-dim:   var(--prim-il-paper-dim);  /* card hover / inset */
--ag-il-ink:         var(--prim-il-ink-500);    /* heavy text / overlay */

/* Action / selection */
--ag-il-yellow:        var(--prim-il-yellow-500);
--ag-il-yellow-hover:  var(--prim-il-yellow-300);
--ag-il-yellow-active: var(--prim-il-yellow-600);
--ag-il-on-yellow:     var(--prim-il-ink-500);  /* yellow bg 上のテキスト */

/* Attention / error */
--ag-il-orange:          var(--prim-il-orange-500);
--ag-il-orange-hover:    var(--prim-il-orange-300);
--ag-il-orange-bg-hover: rgba(255, 122, 0, 0.08);  /* danger button hover bg */

/* Border / outline */
--ag-il-border:       rgba(5, 6, 5, 0.12);
--ag-il-border-hover: rgba(5, 6, 5, 0.24);
--ag-il-bracket:      var(--prim-il-ink-500);   /* L 字 bracket 描画色 */

/* State */
--ag-il-focus-ring:      var(--prim-il-yellow-500);
--ag-il-selected-fill:   var(--prim-il-yellow-500);
--ag-il-selected-ink:    var(--prim-il-ink-500);
--ag-il-disabled-opacity: 0.4;
```

### 2.3 旧 token との対応 (L2-A は **追加のみ**、旧 `--ag-*` は維持)

| 旧 token              | Industrial 対応                   | L2-A での扱い                |
| --------------------- | --------------------------------- | ---------------------------- |
| `--ag-accent` (cyan)  | `--ag-il-yellow`                  | A4 で対象 component のみ切替 |
| `--ag-surface-page`   | `--ag-il-page`                    | 同                           |
| `--ag-surface-opaque` | `--ag-il-paper`                   | 同                           |
| `--ag-error-text`     | `--ag-il-orange`                  | 同                           |
| `--ag-radius-card`    | `--ag-il-radius-card` (新、6-8px) | A4                           |

L2-A 終了時点で旧 token は完全動作のまま残す。L2-B 以降で page-by-page 移行。

## 3. Shape / decoration

### 3.1 角丸スケール (Industrial は控えめ)

```css
--ag-il-radius-chip:   3px;   /* tag chip / pill */
--ag-il-radius-button: 6px;   /* button / IconButton */
--ag-il-radius-input:  4px;   /* input / textarea */
--ag-il-radius-card:   8px;   /* card / panel */
--ag-il-radius-dialog: 10px;  /* dialog / modal */
```

完全角丸 (`9999px`) は **chip / tag のみ**、それ以外は ≤ 10px。

### 3.2 ピル型物理ボタン

```css
.il-button {
  background: var(--ag-il-paper);
  color: var(--ag-il-ink);
  border: 1px solid var(--ag-il-border);
  border-radius: var(--ag-il-radius-button);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.6),
    inset 0 -1px 0 rgba(5, 6, 5, 0.06),
    0 1px 2px rgba(5, 6, 5, 0.08);
  transition: background var(--ag-duration-fast) var(--ag-ease-in-out);
}
.il-button:hover  { background: var(--ag-il-paper-dim); }
.il-button:active { box-shadow: inset 0 1px 2px rgba(5,6,5,0.12); }
.il-button[data-variant="primary"] {
  background: var(--ag-il-yellow);
  color: var(--ag-il-on-yellow);
}
.il-button[data-variant="primary"]:hover  { background: var(--ag-il-yellow-hover); }
.il-button[data-variant="primary"]:active { background: var(--ag-il-yellow-active); }
```

### 3.3 L 字 bracket (focus / 選択 強調)

panel / card 角に inset で L 字を描画。corner SVG または `::before` / `::after` で実装。

```css
.il-bracket-corner {
  --bracket-len: 12px;
  --bracket-w:   2px;
  --bracket-c:   var(--ag-il-bracket);
  position: relative;
}
.il-bracket-corner::before,
.il-bracket-corner::after {
  content: ""; position: absolute; pointer-events: none;
  width: var(--bracket-len); height: var(--bracket-len);
  border-color: var(--bracket-c); border-style: solid; border-width: 0;
}
.il-bracket-corner::before { top: 0; left: 0;  border-top-width:    var(--bracket-w); border-left-width:  var(--bracket-w); }
.il-bracket-corner::after  { bottom: 0; right: 0; border-bottom-width: var(--bracket-w); border-right-width: var(--bracket-w); }
```

選択 / focus 時は `--bracket-c` を `--ag-il-yellow` に切替え。

### 3.4 ハーフトーン / 斜線ハッチ

```css
/* ハーフトーンドット (panel header / decorative) */
.il-dotscreen {
  background-image: radial-gradient(circle at 1px 1px, rgba(5,6,5,0.08) 1px, transparent 1.5px);
  background-size: 6px 6px;
}

/* 斜線ハッチ (skeleton / loading) */
.il-hatching {
  background-image: repeating-linear-gradient(
    -45deg,
    rgba(5,6,5,0.05) 0,
    rgba(5,6,5,0.05) 4px,
    transparent 4px,
    transparent 8px
  );
}
```

## 4. State

| state         | 表現                                                                       | 適用例                |
| ------------- | -------------------------------------------------------------------------- | --------------------- |
| default       | `--ag-il-paper` 背景 + `--ag-il-border`                                    | card / button         |
| hover         | `--ag-il-paper-dim` 背景 + 軽 elevation (shadow-sm)                        | 全 interactive        |
| focus-visible | 蛍光イエロー 2px ring + 2px offset                                         | input / button / card |
| selected      | `--ag-il-selected-fill` 背景 + `--ag-il-on-yellow` ink + L 字 bracket 蛍光 | LibraryCard / chip    |
| active (押下) | `--ag-il-yellow-active` + inset shadow                                     | button                |
| disabled      | `opacity: 0.4` + cursor not-allowed                                        | 全 interactive        |
| error         | orange 菱形 marker + `--ag-il-orange` text                                 | inline alert / chip   |

## 5. Empty / loading / error

- **empty**: prominent CTA pill (yellow primary) + 説明 text + ハーフトーン薄く敷く
- **loading**: card skeleton に 斜線ハッチ + 1.2s 進行 sweep gradient
- **error**: orange 菱形 (`◆`) + `--ag-il-orange` text + 「再試行」 pill button

## 6. Light / Dark mode

L1 までの dark theme override はそのまま維持。Industrial Yellow は **基本同じ token 値**を使うが、paper / ink 系は dark mode で flip:

- `--ag-il-paper` は light=`#F1F1EB` / dark=`#1A1B1A`
- `--ag-il-ink` は **paper 上で読める text color として semantic flip** (light=`#050605` / dark=`#F1F1EB`)。component で `text-[var(--ag-il-ink)]` を default にすれば両 mode で読める
- `--ag-il-on-yellow` は **yellow が両 mode で同じ明るさのため不変** (#050605)
- `--ag-il-border` は ink 基準 rgba (light=`rgba(5,6,5,0.12)` / dark=`rgba(255,255,255,0.18)`)
- `--ag-il-bracket` は dark で yellow に切替 (dark paper 上での視認性確保)

Light mode は L2 以降の polish で扱う。L2-A は **dark default** (現行 user 環境) のみ verify。

## 7. 共通 component prefab (L2-A A3)

- **`IndustrialPanel.svelte`** (~80 行): paper 背景 + L 字 bracket + 任意 dotscreen / hatching slot。`<header>` / default slot / `<footer>` の 3 slot
- **`IndustrialButton.svelte`** (~60 行): variant `primary | secondary | ghost | danger`、size `sm | md`、icon slot

両 component は `tests/e2e/industrial-prefab.spec.ts` で smoke。

## 8. Migration plan (L2-A 以降)

1. **L2-A**: spec + token 追加 + prefab 作成 + 可視部 3 component (LibraryDetailPanel / StatCard / sidebar 1 個) のみ切替 (smoke)
2. **L2-B**: keyboard / undo 関連で focus ring / selected を Industrial に
3. **L2-C**: filter chip / search bar / sort dropdown を Industrial に
4. **L2-D**: empty / loading / error すべて Industrial に
5. **L3**: 旧 `--ag-accent` 等を deprecated 化、最終的に削除 (旧 theme は migration v0xx で remove)

## 9. 退路 (D10)

L2-A 時点で **「default Industrial、user は旧 theme に切替えて戻れる」** を維持。

- `configStore.theme` に `'industrial' | 'classic'` を追加 (default `'industrial'`)
- classic = 既存の cyan accent + 大きい角丸 + 通常 shadow を保持
- L2-A の smoke 範囲では theme 切替えで 3 component が即見た目変わることを verify

## 10. 検証

- A2 token 追加 commit で `pnpm verify` 全段 pass
- A3 prefab で unit (props / variant 切替え) + 実機 CDP screenshot
- A4 切替えで before/after screenshot を Read で目視評価 (DOM 存在判定禁止)
- Codex 二次レビューで token 命名整合 / 旧 token 残存影響を機械検出

## 11. 引用元

- design-direction.md §0.2 (Industrial Yellow checklist) — 4 色 / shape / state の network
- design_system_architecture.md §2 (token 階層 primitive → semantic) — 命名規則
- ux_standards.md §3-3 (focus ring 仕様) — `:focus-visible` ベース
- CLAUDE.md `<critical-rule id="instant-feedback">` — 設定変えたら即見た目
