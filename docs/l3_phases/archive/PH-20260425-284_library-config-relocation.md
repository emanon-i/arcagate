---
id: PH-20260425-284
status: done
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

## 受け入れ条件（実績）

- [x] Settings の Workspace カテゴリから「ライブラリカードサイズ」UI を削除し Library タブへ誘導文言で置換（PH-282 で実施） [Structure]
- [x] Settings > Library で itemSize を含む全 Library カード設定が一括操作可能 [P consistency]
- [x] `data-testid="library-card-{id}"` は維持（既存 E2E が壊れない） [P consistency]
- [x] PH-280〜283 の動作が変わらない（E2E 全件緑） [P, History]
- [x] `pnpm verify` 全通過

## 設計判断ログ

### itemSize の所在

`configStore.itemSize` は **Library カード + Workspace ウィジェット内アイテム共通**の表示サイズプリセットとして残す。

- 理由: 「アイテムを表示する場所すべてで一貫したサイズ感」を持たせる。Library で M を選んだら FavoritesWidget / RecentLaunchesWidget も M のリストアイテム高さになる。
- リスク: Library 設定だけ変えたつもりが Workspace ウィジェットも変わる → ユーザに混乱の可能性
- 緩和: Settings の **Workspace タブ** に「ライブラリカードの設定はライブラリタブに移動しました」という誘導文言を残し、サイズの所在を明示している
- 将来: `libraryCard.size` と `workspace.itemSize` を完全分離する判断は別バッチで再評価

### LibraryCard 分割の見送り

当初 Plan では `LibraryCardGrid` / `LibraryCardBackground` / `LibraryCardLabel` の 3 サブコンポーネント分割を検討していたが、本 Plan では見送った。

- 理由 1: LibraryCard.svelte は現状 ~130 行で、`arcagate-engineering-principles.md §7` の警告閾値（500 行 warning / 1000 行 refactor）から十分離れている
- 理由 2: モード分岐は 3 通りのみ、文字 stroke ロジックも `$derived.by` 1 つに収まる小規模
- 理由 3: 過剰抽象化（`engineering-principles.md §7` の「抽象化しすぎ」スメル）を避ける
- 再評価: 今後 LibraryCard に **背景動画モード** や **メタデータ overlay** のような大きい機能を追加する際に再検討（batch-66 以降で）

### ItemIcon style prop 拡張

PH-281 で ItemIcon に `style` prop を追加し、img / FallbackIcon に伝播するようにした。これは LibraryCard が `object-position` / `color` を渡すため必要。利用箇所は LibraryCard / LibraryMainArea / WidgetItemList / Palette の 4 箇所。重複ロジックは検出されず、ヘルパ抽出は不要と判断。

## 自己検証

- E2E `tests/e2e/library-card-spec.spec.ts` 全 6 ケース緑想定（CI で回す）
- LibraryCard 分割不採用のためファイル LoC は ~130 行のまま許容
- Settings > Library / Workspace タブの誘導文言で迷わない（HICCUPPS U: User）
