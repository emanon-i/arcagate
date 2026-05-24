# LIBRARY_ICON_REFRESH_B案再評価_READONLY_2026-05-25

## 前提確認（現状コード）

- `ItemIcon` は `iconPath -> convertFileSrc(iconPath)` を `iconSrc` に導出し、`<img ... loading={loading} decoding="async">` を描画。`loading` の default は `'lazy'`。\
  根拠: [src/lib/components/arcagate/common/ItemIcon.svelte:24](/E:/Cella/Projects/arcagate/src/lib/components/arcagate/common/ItemIcon.svelte:24), [:30](/E:/Cella/Projects/arcagate/src/lib/components/arcagate/common/ItemIcon.svelte:30), [:32](/E:/Cella/Projects/arcagate/src/lib/components/arcagate/common/ItemIcon.svelte:32), [:61](/E:/Cella/Projects/arcagate/src/lib/components/arcagate/common/ItemIcon.svelte:61)-[:67](/E:/Cella/Projects/arcagate/src/lib/components/arcagate/common/ItemIcon.svelte:67)
- `LibraryView` は list/grid 両方で card を `{#key \` ${item.icon_path}|${item.card_override_json}\`}` で再 mount。\
  根拠: [src/lib/components/arcagate/library/LibraryView.svelte:187](/E:/Cella/Projects/arcagate/src/lib/components/arcagate/library/LibraryView.svelte:187)-[:209](/E:/Cella/Projects/arcagate/src/lib/components/arcagate/library/LibraryView.svelte:209), [:246](/E:/Cella/Projects/arcagate/src/lib/components/arcagate/library/LibraryView.svelte:246)-[:262](/E:/Cella/Projects/arcagate/src/lib/components/arcagate/library/LibraryView.svelte:262)
- `selectImage()` は `cmd_save_icon_file` 後に `applyOptimisticUpdate`→`updateItem`。\
  根拠: [src/lib/components/item/ItemFormCardOverride.svelte:103](/E:/Cella/Projects/arcagate/src/lib/components/item/ItemFormCardOverride.svelte:103)-[:113](/E:/Cella/Projects/arcagate/src/lib/components/item/ItemFormCardOverride.svelte:113)

---

## 1) B案（自前 IntersectionObserver lazy） は必要か

### 判定

- **現時点の静的根拠では「必須ではない」**。
- 理由は、現行の主対症は「lazy 制御」ではなく「`{#key}` による再 mount」であり、B は責務追加（自前 IO 実装）で保守負債を増やすため。

### 1-a perf 観点

- `ItemIcon` 側コメントで「100+ icon の一斉 fetch 抑制」の意図が明記され、default lazy がそこを担っている。\
  根拠: [ItemIcon.svelte:13](/E:/Cella/Projects/arcagate/src/lib/components/arcagate/common/ItemIcon.svelte:13)-[:16](/E:/Cella/Projects/arcagate/src/lib/components/arcagate/common/ItemIcon.svelte:16), [:56](/E:/Cella/Projects/arcagate/src/lib/components/arcagate/common/ItemIcon.svelte:56)-[:59](/E:/Cella/Projects/arcagate/src/lib/components/arcagate/common/ItemIcon.svelte:59)
- かつ call-site で `loading="eager"` override は現状無し（`loading=` は `ItemIcon` 内のみ）。\
  根拠: [ItemIcon.svelte:56](/E:/Cella/Projects/arcagate/src/lib/components/arcagate/common/ItemIcon.svelte:56)（repo grep 結果）
- よって B で native lazy を捨てると、**性能同等を維持する追加実装・追加テストが必要**になりやすい。

### 1-b 過剰実装/保守負債

- 現在 repo に自前 `IntersectionObserver` lazy 実装は見当たらず、導入すると新規状態機械（observe/unobserve/再入/破棄）を増やす。\
  根拠: `IntersectionObserver` の実コード出現なし（repo grep）
- いま問題化しているのは `LibraryView` の `{#key}` 構造依存で、監査スクリプトもそこを gate している。\
  根拠: [LibraryView.svelte:188](/E:/Cella/Projects/arcagate/src/lib/components/arcagate/library/LibraryView.svelte:188)-[:194](/E:/Cella/Projects/arcagate/src/lib/components/arcagate/library/LibraryView.svelte:194), [scripts/audit-appearance-state-mgmt.sh:93](/E:/Cella/Projects/arcagate/scripts/audit-appearance-state-mgmt.sh:93)-[:104](/E:/Cella/Projects/arcagate/scripts/audit-appearance-state-mgmt.sh:104)

---

## 2) A案（`ItemIcon` 内 `<img>` 限定 `{#key iconSrc}`）でB不要か

### ユーザー仮説の成立性

- **成立する**。`iconSrc` は `iconPath` 由来の派生値なので、`icon_path` 更新時に `iconSrc` が変わる。\
  根拠: [ItemIcon.svelte:7](/E:/Cella/Projects/arcagate/src/lib/components/arcagate/common/ItemIcon.svelte:7), [:25](/E:/Cella/Projects/arcagate/src/lib/components/arcagate/common/ItemIcon.svelte:25), [:32](/E:/Cella/Projects/arcagate/src/lib/components/arcagate/common/ItemIcon.svelte:32)
- よって `{#key iconSrc}` を `<img>` に限定すれば、**カード全体再 mount ではなく `<img>` だけ再生成**できる設計になる（構造的に妥当）。

### `img.decode()` await 方式との比較

- 現行は `decoding="async"` の declarative 運用で、`img.decode()` を明示制御していない。\
  根拠: [ItemIcon.svelte:67](/E:/Cella/Projects/arcagate/src/lib/components/arcagate/common/ItemIcon.svelte:67)
- 本件の対症対象が「要素再生成で stale を断つ」なら、`<img>` 限定 `{#key}` の方が責務が単純。`decode()` await は読み込み状態管理を追加する。
- ただしこの比較は一部推論（実機未検証）を含む。

### `{#key iconSrc}` + `loading="lazy"` で fetch trigger されない懸念

- **静的コードだけでは 0 リスク断言不可**。ブラウザ実装依存。
- ただし設計上は「新 `<img>` 要素」になるため native lazy の判定対象も新要素になる、という期待は合理的。
- この点は **低信頼（実機確認要）**。

---

## 3) Aを正しく実装した場合、既存ハックは剥がせるか（項目別）

- `LibraryView.svelte` の `{#key item.icon_path|card_override_json}`（list/grid）
  - **剥がせる**（Aで `<img>` 再生成責務を `ItemIcon` に局所化できるため）。
  - 根拠: [LibraryView.svelte:194](/E:/Cella/Projects/arcagate/src/lib/components/arcagate/library/LibraryView.svelte:194), [:248](/E:/Cella/Projects/arcagate/src/lib/components/arcagate/library/LibraryView.svelte:248), [ItemIcon.svelte:32](/E:/Cella/Projects/arcagate/src/lib/components/arcagate/common/ItemIcon.svelte:32)

- `items.svelte.ts` の `applyOptimisticUpdate` 経路
  - **剥がせない**（これは icon stale 専用ではなく slider live preview 共通基盤）。
  - 根拠: [items.svelte.ts:80](/E:/Cella/Projects/arcagate/src/lib/state/items.svelte.ts:80)-[:89](/E:/Cella/Projects/arcagate/src/lib/state/items.svelte.ts:89), [ItemFormCardOverride.svelte:35](/E:/Cella/Projects/arcagate/src/lib/components/item/ItemFormCardOverride.svelte:35)-[:38](/E:/Cella/Projects/arcagate/src/lib/components/item/ItemFormCardOverride.svelte:38), [:202](/E:/Cella/Projects/arcagate/src/lib/components/item/ItemFormCardOverride.svelte:202)-[:234](/E:/Cella/Projects/arcagate/src/lib/components/item/ItemFormCardOverride.svelte:234)

- `ItemFormCardOverride.svelte` `selectImage()` 内 `applyOptimisticUpdate`
  - **剥がさない方がよい**（A後も即時UI反映の体感改善に寄与、`updateItem` 往復待ちを避ける目的が残る）。
  - 根拠: [ItemFormCardOverride.svelte:106](/E:/Cella/Projects/arcagate/src/lib/components/item/ItemFormCardOverride.svelte:106)-[:112](/E:/Cella/Projects/arcagate/src/lib/components/item/ItemFormCardOverride.svelte:112)

- `LibraryCard.svelte` の `contain: layout style`
  - **剥がし可（A成立には不要）**。ただしこれは stale 対策ではなくレイアウト分離のCSSなので、性能回帰観点で別評価が必要。
  - 根拠: [LibraryCard.svelte:206](/E:/Cella/Projects/arcagate/src/lib/components/arcagate/library/LibraryCard.svelte:206)-[:208](/E:/Cella/Projects/arcagate/src/lib/components/arcagate/library/LibraryCard.svelte:208)

- `scripts/audit-appearance-state-mgmt.sh` の `{#key}` 構造保証 gate
  - **剥がす/更新必要**（現 gate は `LibraryView` の `{#key}` 存在を必須化）。
  - 根拠: [audit-appearance-state-mgmt.sh:93](/E:/Cella/Projects/arcagate/scripts/audit-appearance-state-mgmt.sh:93)-[:104](/E:/Cella/Projects/arcagate/scripts/audit-appearance-state-mgmt.sh:104)

- `freshIconMark` / `__arcagateTest__` 死骸
  - **実コード参照は 0 件、コメント/監査文言のみ残存**。
  - 根拠: [items.svelte.ts:15](/E:/Cella/Projects/arcagate/src/lib/state/items.svelte.ts:15), [:231](/E:/Cella/Projects/arcagate/src/lib/state/items.svelte.ts:231), [LibraryCard.svelte:94](/E:/Cella/Projects/arcagate/src/lib/components/arcagate/library/LibraryCard.svelte:94), [audit-appearance-state-mgmt.sh:16](/E:/Cella/Projects/arcagate/scripts/audit-appearance-state-mgmt.sh:16)

- その他②対症残骸
  - `LibraryView` 内コメント群が「`{#key}` 前提運用」を強く固定化。A移行時は整合更新が必要。
  - 根拠: [LibraryView.svelte:188](/E:/Cella/Projects/arcagate/src/lib/components/arcagate/library/LibraryView.svelte:188)-[:193](/E:/Cella/Projects/arcagate/src/lib/components/arcagate/library/LibraryView.svelte:193)

---

## 最終結論

- **結論**: 「Bは不要。Aを `ItemIcon` の `<img>` 限定 `{#key iconSrc}` で実装し、`LibraryView` の広域 `{#key}` とその監査gateを撤去/置換する」方針は、静的設計として妥当。
- ただし **`applyOptimisticUpdate`（store即時更新）は別目的（live preview/体感遅延低減）なので全撤去対象ではない**。

## 残る不確実性（実機未検証）

- native lazy が「新規再生成 `<img>`」に対して modal close タイミングで確実に即fetch/paintされるかは、ブラウザ実装依存で静的保証不可。
- `contain: layout style` 除去時の perf/paint 影響は静的解析では判定不可。
- よって根治断言には、A実装後に LB-2 相当の実UI経路で再検証が必要。
