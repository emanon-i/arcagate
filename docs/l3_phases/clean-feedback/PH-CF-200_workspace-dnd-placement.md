---
id: PH-CF-200
status: planning
batch: clean-feedback
type: バグ修正
era: Distribution Hardening
parent: README.md
---

# PH-CF-200: workspace D&D 配置経路の洗い直し

## 元 user fb (検収項目)

- **E1**: 画像 / ファイルを workspace に D&D で配置すると左上端に置かれる。 **特にアイテム 0 個の状態で D&D すると必ず左上端**。 PR #543 で直したはずの再発。 配置・座標計算・永続化・描画の処理経路を全部洗い直し、 無駄 / 複雑さを削る

## 問題

OS ファイルドロップで workspace に widget を配置すると、 ドロップ位置と無関係な場所 (アイテム 0 個なら必ず (0,0) = 左上端) に置かれる。

**「PR #543 で直したはず」 は誤帰属**。 `git show` で #543 (`6e91b89`) を確認したところ、 変更は `WorkspaceGrid.svelte` / `zoom-math.ts` / `widget-zoom.svelte.ts` のみ — PageTabBar の overlay 化と fit-to-content の visual center 計算であり、 **D&D 配置コードには一切触れていない**。 E1 はリグレッションではなく **そもそもドロップ座標が配置に使われたことがない既存欠陥**。

## 引用元 guideline doc

| Doc                                                | Section                                 | 採用判断への寄与                             |
| -------------------------------------------------- | --------------------------------------- | -------------------------------------------- |
| `docs/l2_foundation/features/screens/workspace.md` | widget 配置                             | ドロップ位置 = 配置位置の契約                |
| `docs/l0_ideas/motivation.md`                      | 成功条件                                | 「置いた所に置かれる」 は daily-use の最低線 |
| `CLAUDE.md`                                        | `<critical-rule id="instant-feedback">` | D&D は即・意図通りに反映                     |
| `CLAUDE.md`                                        | 進行モード「無駄 / 複雑さを削る」       | 4 経路に分散した配置ロジックの集約           |

## Fact 確認 (root cause)

### 処理経路 (file:line)

1. **OS ファイルドロップ受信**: `src/routes/+page.svelte:167` `listen('tauri://drag-drop', ...)`。 payload は `{ paths: string[] }` のみ — **`tauri://drag-drop` は OS 仕様上カーソル座標 (clientX/Y) を持たない** (`+page.svelte:272` のコメントも同旨)
2. **widget 生成**: 画像 → `addImageScrapWidget` (`+page.svelte:140`)、 テキスト / ファイル → `addFilePreviewWidget` (`+page.svelte:156`)。 どちらも `workspaceStore.addWidget(type)` を **座標引数なし** で呼ぶ
3. **配置決定**: `workspace-widgets.svelte.ts:166` `addWidget(type, nearCell?, cols?)`。 `nearCell` 未指定 → `seedCell = nearCell ?? computeClusterAnchor(rects)` (`:198`)
4. **`computeClusterAnchor`** (`:110-123`): `rects.length === 0` のとき `return null`
5. → `seedCell` が `null` → `findFreePosition(w, h, rects, ...)` (`:201`) が **(0,0) から線形 scan** → アイテム 0 個なら必ず `(0,0)` = 左上端

### 「アイテム 0 個で必ず左上端」 の真因 (断定)

`workspace-widgets.svelte.ts:111` `computeClusterAnchor` が空配列で `null` を返し、 `addWidget` `:198→:201` のフォールバックが (0,0) 起点 `findFreePosition` になる。 アイテムが 1 個以上あれば BB 中心 seed で多少マシだが、 これも **「ドロップ位置」 ではなく「既存クラスタの中心」**。 ドロップ座標は経路上どこにも入っていない。

### 配置ロジックの分散 (簡素化対象)

widget 配置に 4 経路: `addWidget` (spiral seed)、 `addWidgetAt` (直接座標)、 `bulkAddItemWidgets` (線形)、 `computeClusterAnchor` (seed 算出)。 一方 **widget 自体の D&D** (`WorkspaceWidgetGrid.svelte:58` `calcDropCell` + `pointer-drag`) は座標 → セル変換が正しく動いている。 OS ファイルドロップだけが座標を捨てている非対称。

## スコープ

- OS ファイルドロップの **ドロップ座標を捕捉し、 グリッドセルへ変換して配置** する
- アイテム 0 個でも「ドロップした場所」 (または viewport 中心) に置く
- 配置 seed 解決ロジックを 1 関数へ集約 (簡素化)

## やらないこと

- widget 自体の D&D 移動 (`WorkspaceWidgetGrid` 経路) — 正常動作のため変更しない
- workspace の zoom / pan 機構の再設計

## 具体タスク

1. **ドロップ座標の捕捉**: `tauri://drag-drop` は座標を持たないため、 HTML5 の `drop` イベント (`+page.svelte:292` `extractUrlFromDataTransfer` 経路) で `e.clientX/clientY` を取得する経路に寄せる。 `tauri://drag-drop` と HTML5 drop の役割を整理し、 配置には座標を持つ後者を使う
2. **座標 → セル変換**: `WorkspaceWidgetGrid.svelte:58` `calcDropCell()` 相当 (zoom / pan / scroll 補正込み) を再利用し、 ドロップ点をグリッドセル `{x, y}` に変換
3. **配置 API の集約**: `addWidget` / `addWidgetAt` / `bulkAddItemWidgets` の seed 解決を **1 関数** `resolveSeedCell({ dropCell?, nearCell?, rects })` に集約。 優先度 = ドロップ座標 → nearCell → クラスタ中心 → viewport 中心 (`WorkspaceLayout.svelte:153` 相当)。 **空配列でも (0,0) にフォールバックしない**
4. **`addImageScrapWidget` / `addFilePreviewWidget` を座標付きに**: タスク 2 で得たセルを `addWidgetAt(type, x, y, cols)` に渡す
5. 永続化 (`workspace_repository`) と描画 (`WorkspaceGrid`) は座標が正しく入れば既存経路で OK — 変更後に経路を 1 度通しで確認

## 受け入れ条件 (機械検出)

- [ ] e2e: **アイテム 0 個** の workspace で canvas の中央付近に画像を D&D → 配置 widget の grid 座標が (0,0) でなく、 ドロップ点近傍のセルであること
- [ ] e2e: アイテム複数個の workspace で右下にファイルを D&D → 既存クラスタ中心でなくドロップ点近傍に配置
- [ ] unit test: `resolveSeedCell` が空 rects + dropCell 指定で dropCell を返す / dropCell も nearCell も無いとき viewport 中心を返し (0,0) にフォールバックしない
- [ ] 配置経路の関数数が 4 → 集約後の本数に減っていること (doc に before/after を記載)

## 機能契約の追記

`features/screens/workspace.md`:

> **D&D 配置契約**: workspace へのドロップ (OS ファイル / item / widget いずれも) は **ドロップ座標を grid セルへ変換した位置に配置** する。 既存 widget の有無・個数は配置位置を変えない。 ドロップ座標が取得できない経路 (`tauri://drag-drop` 等) は配置に使ってはならず、 座標を持つ経路へ寄せる。 座標が真に不明な場合のフォールバックは viewport 中心であり、 (0,0) ではない。

機械検出: 上記 e2e (アイテム 0 個ドロップ) を回帰テストとして常設。

## 横展開

- `bulkAddItemWidgets` (Library から複数 item を workspace へ送る経路) も座標を持つなら同じ集約 API を通す
- `tauri://drag-drop` を配置座標に使っている箇所が他に無いか grep
- E1 の e2e は「アイテム 0 個」 ケースを必ず含める (再発の最短経路がそこ)

## 工数感

| Task                                    | 工数   |
| --------------------------------------- | ------ |
| ドロップ座標捕捉 + tauri/HTML5 経路整理 | 1-2 日 |
| 座標 → セル変換の再利用                 | 1 日   |
| 配置 API 集約 (簡素化)                  | 2-3 日 |
| test (e2e + unit)                       | 1.5 日 |

合計: 約 1-1.5 週間。

## 依存・着手順

- **先行**: なし
- **後続**: なし

## 参照

- `src/routes/+page.svelte:140, 156, 167, 272, 292`
- `src/lib/state/workspace-widgets.svelte.ts:110-123, 166, 198, 201`
- `src/lib/components/arcagate/workspace/WorkspaceWidgetGrid.svelte:58`
- `src/lib/components/arcagate/workspace/WorkspaceLayout.svelte:153`
- PR #543 = commit `6e91b89` (D&D 配置とは無関係であることの根拠)
  </content>
