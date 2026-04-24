# PH-20260424-248 Liquid Glass Apple 寄り強化 + トークン命名整理

- **フェーズ**: batch-58 Plan E（整理系）
- **status**: done
- **開始日**: -

## 目的

実機フィードバック: Liquid Glass は「それっぽい」水準だが、もう一押し Apple 寄りに。
shadow の多層化・hover 浮き上がりアニメーション強化を実施。
あわせてテーマ関連トークンの命名揺れ（`--ag-shadow-lg` が migration にあるが base CSS にない等）を整理。

## 技術方針

### Shadow 多層化（arcagate-theme.css 構造ルール更新）

Liquid Glass の library card ホバーエフェクトを強化:

```css
[data-theme="theme-builtin-liquid-glass"] [data-testid^="library-card-"]:hover {
  transform: translateY(-3px);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.5),
    0 2px 8px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    inset 0 -1px 0 rgba(0, 0, 0, 0.1);
  border-color: rgba(255, 255, 255, 0.22);
  transition:
    transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1),
    box-shadow 200ms ease-out,
    border-color 150ms ease-out;
}
```

Palette overlay のガラス感も強化:

```css
[data-theme="theme-builtin-liquid-glass"] [role="dialog"][aria-modal="true"] > div {
  backdrop-filter: blur(28px) saturate(200%) brightness(1.1);
  box-shadow:
    0 24px 80px rgba(0, 0, 0, 0.7),
    0 0 0 1px rgba(255, 255, 255, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.18);
}
```

### トークン命名整理

- `--ag-shadow-lg` が `012_liquid_glass_theme.sql` に登場するが `arcagate-theme.css` に定義なし → base CSS に追加
- `--ag-surface-page` が Liquid Glass の css_vars に未定義 → migration に追加

## 受け入れ条件

- [ ] Liquid Glass でカードにホバーすると多層 shadow + 浮き上がりアニメーションが動く
- [ ] `--ag-shadow-lg` が `arcagate-theme.css` の `:root` に定義されている
- [ ] `pnpm verify` 全通過
