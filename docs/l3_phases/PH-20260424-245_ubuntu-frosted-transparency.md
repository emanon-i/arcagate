# PH-20260424-245 Ubuntu Frosted 透明化強化

- **フェーズ**: batch-58 Plan B（改善 2）
- **status**: todo
- **開始日**: -

## 目的

実機フィードバック: Ubuntu Frosted に「Frosted」感がない（透明感弱い）。
backdrop-filter + 半透明 surface を強化し、壁紙が透けて見えるガラスOS感を作る。

## 技術方針

### CSS 構造ルール追加（arcagate-theme.css）

```css
[data-theme="theme-builtin-ubuntu-frosted"] body {
  background: var(--ag-bg);
}

/* サイドバー */
[data-theme="theme-builtin-ubuntu-frosted"] .ag-sidebar {
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  background: rgba(30, 21, 35, 0.65) !important;
  border-right: 1px solid rgba(233, 84, 32, 0.18);
}

/* Library カード */
[data-theme="theme-builtin-ubuntu-frosted"] [data-testid^="library-card-"] {
  backdrop-filter: blur(12px) saturate(160%);
  -webkit-backdrop-filter: blur(12px) saturate(160%);
  background: rgba(37, 27, 47, 0.55) !important;
  box-shadow:
    0 2px 12px rgba(0, 0, 0, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

/* Dialog / popover */
[data-theme="theme-builtin-ubuntu-frosted"] [role="dialog"] > div {
  backdrop-filter: blur(20px) saturate(200%);
  -webkit-backdrop-filter: blur(20px) saturate(200%);
}
```

### CSS vars 強化（新 migration `014_ubuntu_frosted_enhanced.sql`）

- `--ag-surface-0`: `rgba(25, 18, 32, 0.60)`（不透明度を下げる）
- `--ag-surface-1`: `rgba(30, 21, 35, 0.55)`
- `--ag-surface-2`: `rgba(40, 28, 50, 0.50)`
- `--ag-surface-page`: `#1a1122`（solid な深紫 — 壁紙が透けるベースとして機能）
- `--ag-backdrop`: `blur(24px) saturate(180%)`
- `--ag-radius-card`: `18px`（角丸大きめ → 柔らかいガラス感）
- `--ag-radius-widget`: `22px`
- `--ag-accent`: `#e95420`（Ubuntu オレンジ、現状と同値 — 維持）

### 前提: Tauri window transparent

現在メインウィンドウは `transparent: false`。
壁紙透過のためには `transparent: true` + 背景 HTML 透明化が必要だが、
Windows では透過ウィンドウで角の描画問題が出やすい → **今回は内部パネルのガラス感強化のみ**。
真の壁紙透過は PH-Future として凍結。

## 受け入れ条件

- [ ] サイドバー・ライブラリカードに blur がかかっている（視覚確認）
- [ ] Ubuntu Frosted ↔ Flat の視覚差が明確
- [ ] `--ag-surface-*` を半透明にしても文字・アイコンが読める
- [ ] `pnpm verify` 全通過
