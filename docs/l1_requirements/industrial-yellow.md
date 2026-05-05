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

→ §4-10 (state / empty / mode / prefab / migration / 検証) は [industrial-yellow-extras.md](./industrial-yellow-extras.md)
