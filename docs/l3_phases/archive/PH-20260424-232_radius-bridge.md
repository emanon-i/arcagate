---
id: PH-20260424-232
title: --radius を --ag-radius-button に bridge
status: done
priority: low
parallel_safe: true
scope_files:
  - src/app.css
depends_on: [PH-20260424-231]
---

## 目的

shadcn の `--radius` トークンを `var(--ag-radius-button)` に bridge し、
ThemeEditor で radius 変数を変更すると shadcn Button 等の角丸にも反映されるようにする。

## 実装内容

`src/app.css` の `:root { --radius: 0.625rem; }` を以下に変更:

```css
--radius: var(--ag-radius-button);
```

`@theme inline {}` の `--radius-sm/md/lg/xl` は `calc(var(--radius) - 4px)` 等で
CSS の calc が解決するため、変数参照でも正しく機能する。

## 受け入れ条件

- [ ] ThemeEditor で `--ag-radius-button` を変更すると Button の角丸が変化する
- [ ] `pnpm verify` 全通過
