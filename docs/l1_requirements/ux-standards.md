# Arcagate UX 標準

Arcagate 固有の数値仕様・実装規約。一般的な UX 原則（WCAG 数値等）は省略する。

---

## パフォーマンス目標値

| 指標             | 目標      |
| ---------------- | --------- |
| アプリ起動 P95   | ≤ 2,500ms |
| Palette 表示 P95 | ≤ 120ms   |
| アイテム起動 P95 | ≤ 200ms   |
| Idle メモリ      | ≤ 120MB   |
| Idle CPU         | ≤ 1%      |
| exe 単体サイズ   | ≤ 20MB    |

---

## モーション標準

### Duration トークン値

| トークン                | 値    | 用途                   |
| ----------------------- | ----- | ---------------------- |
| `--ag-duration-instant` | 80ms  | ドラッグフィードバック |
| `--ag-duration-fast`    | 120ms | ホバー・フォーカス     |
| `--ag-duration-normal`  | 200ms | パネル出現・ダイアログ |
| `--ag-duration-slow`    | 300ms | テーマ切替             |

### Easing トークン値

| トークン           | 値                                     | 用途                                   |
| ------------------ | -------------------------------------- | -------------------------------------- |
| `--ag-ease-in-out` | `cubic-bezier(0.25, 0.46, 0.45, 0.94)` | ホバー・パネル・ダイアログ（統一基準） |
| `--ag-ease-out`    | `cubic-bezier(0.0, 0, 0.2, 1)`         | 要素の出現                             |
| `--ag-ease-in`     | `cubic-bezier(0.4, 0, 1, 1)`           | 要素の消去                             |
| `--ag-ease-bounce` | `cubic-bezier(0.34, 1.56, 0.64, 1)`    | ドロップ成功                           |

### コンポーネント別仕様

| コンポーネント     | 操作  | duration | easing      | 追加変化                  |
| ------------------ | ----- | -------- | ----------- | ------------------------- |
| Button             | hover | fast     | ease-out    | bg opacity +1 段階        |
| Button             | click | instant  | linear      | scale 0.97                |
| Card / List item   | hover | fast     | ease-out    | bg opacity +1 段階        |
| Dialog             | 出現  | normal   | ease-out    | scale 0.96→1 + fade       |
| Dialog             | 消去  | fast     | ease-in     | scale 1→0.96 + fade       |
| Toast              | 出現  | normal   | ease-out    | translateY -100%→0 + fade |
| Palette            | 出現  | normal   | ease-out    | scale 0.98→1 + fade       |
| D&D ドロップゾーン | over  | fast     | linear      | border-accent + glow      |
| D&D 成功           | drop  | fast     | ease-bounce | scale 1.02→1              |

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  :root {
    --ag-duration-instant: 0ms;
    --ag-duration-fast: 0ms;
    --ag-duration-normal: 0ms;
    --ag-duration-slow: 0ms;
  }
}
```

全アニメーション要素に `motion-reduce:transition-none` を付与する。

---

## 状態別カラー差分ルール

| 状態     | 背景                      | ボーダー                    | テキスト            |
| -------- | ------------------------- | --------------------------- | ------------------- |
| default  | `surface-0` / `surface-1` | `--ag-border`               | `--ag-text-primary` |
| hover    | `surface-2` / `surface-3` | `--ag-border-hover`         | `--ag-text-primary` |
| focus    | `surface-2`               | `--ag-accent-border`        | `--ag-text-primary` |
| active   | `surface-4`               | `--ag-accent-border`        | `--ag-text-primary` |
| disabled | `surface-0`（変化なし）   | `--ag-border`               | `--ag-text-faint`   |
| selected | `accent-active-bg`        | `--ag-accent-active-border` | `--ag-accent-text`  |

---

## Widget 仕様

### Grid セルサイズ

- BASE_W = 240px / BASE_H = 135px（16:9、zoom 100%）
- zoom 範囲: 25〜200%
- 実装: `src/lib/state/widget-zoom.svelte.ts` + `src/lib/utils/zoom-math.ts`

### Zoom anchor（Figma / Obsidian 準拠）

- **Ctrl + wheel**: mouse cursor を anchor
- **Ctrl+0 / Reset**: viewport center を anchor、zoom のみ 100% に戻す
- **Ctrl+Shift+1 / Fit**: 全 widget BB 重心を viewport visual center に置く
- 計算式: `T1 = Sm − (Sm − T0) × (z1 / z0)`
- `clampZoom()` 一箇所のみ、scroll は `behavior: 'instant'`

### Widget ヘッダ layout

- 親 flex container に `min-w-0 flex-1`
- icon wrapper に `shrink-0`
- title `<div>` に `min-w-0 flex-1 truncate`
- 右側 menu button に `shrink-0`

### Widget list-row layout（ExeFolder / FileSearch / Snippet 等）

- row container に `min-w-0`
- icon: `shrink-0`（固定 16px）
- name: `min-w-0 flex-1 truncate`
- suffix（count chip 等）: `shrink-0`

### Widget config 変更時の state 取り扱い

`$effect` で config 派生の async 取得をする場合:

1. effect 開始時に派生 state を即時 clear（旧結果が残らないように）
2. `requestId`（カウンタ）を発行し、古いレスポンスを破棄

### Item 参照 widget の cascade

Widget が item_id を保持している場合、Library でアイテム削除時に Rust 側 (`workspace_repository::cascade_remove_item_from_widgets`) が全 widget config を scan して該当 ID を除去する。削除確認 dialog は `cmd_count_item_references(id)` で参照 widget 数を表示する。

---

## Workspace Canvas 仕様

### 3 階層構造（新機能追加時は必ずどの階層に属するか明示）

1. **背景（固定）** — wallpaper / 最背景 absolute layer。canvas の外側に配置。pan の影響を受けない
2. **Toolbar（固定）** — PageTabBar（上部）/ Undo toolbar（右下）/ HintBar（下部）。canvas の sibling として `relative z-XX shrink-0` で配置
3. **Content（scroll/pan）** — widget grid。canvas（overflow-auto）内の 5000×5000 infinite wrapper 内に配置。初期 scroll は (1900, 1900) 付近

**禁止:** wallpaper を canvas 内に置く（pan で動く）/ toolbar を canvas 内に置く（pan で消える）

### Workspace は常時編集可能

旧「編集モード」toggle は廃止済み。pointer-up / config 変更で即 IPC + DB 反映。誤操作回復は Undo/Redo。

### Overlap reject（全経路で適用）

| 経路             | 動作                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------ |
| panel click 追加 | `findFreePosition` で空き探索、null なら toast「空きスペースがありません」+ 追加せず |
| drag 追加        | `wouldOverlapAt(x, y)` overlap → toast + 追加せず                                    |
| 移動             | overlap → toast + 元位置維持                                                         |
| リサイズ         | `clampResizeForOverlap` で rubber-band                                               |

実装: `src/lib/utils/widget-grid.ts`

### Obsidian 入力マッピング

| 入力                            | 動作               |
| ------------------------------- | ------------------ |
| Ctrl + wheel                    | zoom               |
| Shift + wheel                   | 横 scroll          |
| 中ボタン drag / Space + 左 drag | 自由 pan           |
| Ctrl+0                          | zoom 100% リセット |
| Ctrl+Shift+1                    | Fit to content     |
| Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y  | Undo / Redo        |

### Undo/Redo system

- 種別: add / remove / move / resize / config（5 種）
- 50 件 ring buffer、undo 後の新 mutation で redo stack 破棄

### Widget 選択・削除 UI

- 選択 widget のみに selection ring (`ring-2 ring-[var(--ag-accent)]`) + drag bar + × button + 8 方向 resize handle を表示
- 非選択 widget には handle を一切表示しない（認知ノイズを避ける）

### Resize handle（8 方向、実装: `WidgetHandles.svelte`）

edge: 1.5px ストリップ（hover で半透明 accent）/ corner: 12×12 chip（hover で scale-125 + accent border）

---

## Button バリアント

| バリアント  | 背景             | テキスト              | ボーダー            |
| ----------- | ---------------- | --------------------- | ------------------- |
| primary     | `--ag-accent`    | `#090b10`（ダーク時） | なし                |
| secondary   | `--ag-surface-1` | `--ag-text-primary`   | `--ag-border`       |
| ghost       | transparent      | `--ag-text-secondary` | なし                |
| destructive | `--ag-error-bg`  | `--ag-error-text`     | `--ag-error-border` |

---

## Library カードサイズ

| サイズ | トークン        | 用途                                 |
| ------ | --------------- | ------------------------------------ |
| S      | `--ag-card-w-s` | コンパクト一覧                       |
| M      | `--ag-card-w-m` | 標準                                 |
| L      | `--ag-card-w-l` | サムネイル重視（ゲームライブラリ等） |

具体値は `src/lib/styles/arcagate-theme.css` の `--ag-card-w-*` 参照。
