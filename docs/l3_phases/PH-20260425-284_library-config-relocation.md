---
id: PH-20260425-284
status: todo
batch: 65
type: 整理
---

# PH-284: Library 関連設定の所在統一 + ItemCard 系の責務分離リファクタ

## 参照した規約

- `arcagate-engineering-principles.md` §7 リファクタ発動条件（duplicate code / SRP）
- `docs/desktop_ui_ux_agent_rules.md`: §3 設定 UX 統一
- メモリ `project_library_card_spec.md` (Settings 連動節)

## 背景・目的

PH-280〜282 で Library カード設定が肥大化する。複数箇所に散らばると保守困難。

整理対象:

1. **旧 `itemSize` の所在**: 現状 `WorkspaceSettings`（または相当）に Library アイテムサイズが置かれている可能性 → 全削除し Settings > Library に集約（PH-282 と整合）
2. **LibraryCard.svelte の肥大化**: PH-280〜282 で 4:3 / 背景 3 モード / 文字 stroke / focal point など複数関心が同居 → サブコンポーネントに分割
3. **重複ロジック**: ItemIcon の表示処理が LibraryCard / WorkspaceItemCard / Palette で重複している可能性 → 共通化

## 仕様

### 1. 設定の所在統一

- 旧 `itemSize` の参照箇所を全 grep で洗い出し
  - `git grep -nE "itemSize|item-size|item_size"` で確認
- 全て `configStore.libraryCard.size` に置換
- Workspace 側の Library カード設定 UI（あれば）を削除し、Settings > Library に誘導するヒントを表示するか、単に消す

### 2. LibraryCard コンポーネント分割

```
LibraryCard.svelte (entry, viewMode 切替)
├── LibraryCardGrid.svelte  (4:3 グリッド表示、PH-280)
│   ├── LibraryCardBackground.svelte (背景 3 モード、PH-282)
│   └── LibraryCardLabel.svelte      (文字色 / stroke / オーバーレイ、PH-281)
└── LibraryCardList.svelte  (リスト表示、既存)
```

各サブコンポーネントは props で `cardConfig` を受ける。

### 3. ItemIcon の重複（観察のみ）

調査: `git grep -l "ItemIcon"` で使用箇所を列挙し、重複ロジックを検出。
重複が小さい（< 5 行）なら本 Plan では着手せず、観察結果のみ dispatch-log に記録。
重複が大きい場合は本 Plan で utility 化（`getItemIconConfig(item)` ヘルパ等）。

## 作業内容

- 旧 `itemSize` 全置換
- `LibraryCardGrid.svelte` / `LibraryCardBackground.svelte` / `LibraryCardLabel.svelte` 新規作成
- `LibraryCard.svelte` を viewMode 分岐 + サブ呼び出しに簡素化
- ItemIcon 重複は観察、重大なら utility 化
- E2E テストの `data-testid` は `library-card-{id}` を維持（テスト互換）

## 受け入れ条件

- [ ] `git grep "configStore.itemSize"` が 0 件 [Structure]
- [ ] LibraryCard.svelte が ~30 行以下（責務分離） [Structure]
- [ ] `data-testid="library-card-{id}"` は維持（既存 E2E が壊れない） [P consistency]
- [ ] PH-280〜283 の動作が変わらない（rerun で全 E2E 緑） [P, History]
- [ ] `pnpm verify` 全通過

## 自己検証

- 分割後の `git diff --stat` でファイル単位の LoC を確認
- E2E 全件緑（@smoke + nightly）
- 設定変更が引き続き即時反映される
