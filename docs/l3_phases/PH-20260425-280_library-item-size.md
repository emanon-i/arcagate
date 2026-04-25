---
id: PH-20260425-280
status: todo
batch: 64
type: 改善
---

# PH-280: Library アイテムサイズ横縦両対応 + 外側 padding 吸収レイアウト

## 参照した規約

- `docs/l1_requirements/ux_standards.md`: §2 サイズプリセット（S/M/L）
- `arcagate-engineering-principles.md` §6 SFDIPOT: Function / Data（サイズ比率 / fixed / fluid）

## 背景・目的

現状、Library アイテムサイズは**高さのみ**可変（S/M/L）。横幅も同時に変更できるようにして、均一なグリッドレイアウトを実現する。

## 仕様

### アイテムサイズプリセット（横 × 縦）

| サイズ | 幅    | 高さ  |
| ------ | ----- | ----- |
| S      | 96px  | 96px  |
| M      | 128px | 128px |
| L      | 160px | 160px |

数値は ux_standards.md §2 に従い確定する（上記はたたき台）。

### レイアウト規則

- アイテム幅: **固定**（選択サイズ）
- gap（アイテム間スペース）: **固定**（変えない）
- 列数: ウィンドウ幅に応じて決定（`Math.floor((containerWidth + gap) / (itemWidth + gap))`）
- container padding-left / padding-right: `(containerWidth - (cols * itemWidth + (cols-1) * gap)) / 2` で均等分配

列数が変わるとき（ウィンドウ resize）: CSS `auto-fill` または計算で動的に決定。gap は固定を維持。

### CSS 実装方針

```css
.library-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, <itemWidth>px);
  gap: <gap>px;
  justify-content: center; /* 外側 padding を自動で均等に */
}
```

`justify-content: center` を使えば外側 padding は CSS が自動計算。列数は `auto-fill` で動的に変わる。gap は固定されたまま。

ウィンドウが狭くなれば列数が自然に減る（reflow）。アイテム間のスペースは変わらない。

## 成果物

- `src/lib/components/arcagate/library/` の Library アイテムグリッド CSS 修正
- サイズプリセットに横幅を追加（S/M/L それぞれ width + height）
- 設定 UI で現状の height スライダー → S/M/L プリセットボタン（または両対応）に変更

## 受け入れ条件

- [ ] S/M/L で横 × 縦サイズが同時に変わる [Function]
- [ ] ウィンドウ幅が変わっても gap は固定で外側 padding が変わる [Data]
- [ ] アイテム間スペースが一定（computed style で確認） [Data]
- [ ] サイズ設定が即時反映される（ワークスペース切替不要） [Time]
- [ ] `pnpm verify` 全通過
