# §4 影響範囲 + 退行 risk

## 4.1 zoom が触る state 一覧

| state                                        | 場所                             | zoom 変化で更新?                                                           |
| -------------------------------------------- | -------------------------------- | -------------------------------------------------------------------------- |
| `configStore.widgetZoom`                     | config.svelte.ts $state          | ✅ 直接                                                                    |
| `widgetW` / `widgetH` $derived               | widget-zoom.svelte.ts            | ✅ 自動 derive                                                             |
| `dynamicCols` $derived                       | WorkspaceLayout.svelte L332      | ✅ 自動 (widgetW 経由)                                                     |
| `canvasW` / `canvasH` $derived               | WorkspaceLayout.svelte L406-410  | ✅ 自動 (widgetW/H 経由)                                                   |
| `--widget-w` / `--widget-h` CSS var          | WorkspaceLayout.svelte L492      | ✅ 反応                                                                    |
| `data-zoom` attribute                        | WorkspaceLayout.svelte L493      | ✅ 反応                                                                    |
| `workspaceContainer.scrollLeft/Top`          | DOM                              | ⚠️ **Phase 1 の主題**: 旧実装は anchor 補正なし、新実装は anchor 補正で更新 |
| `localStorage arcagate.workspace.pan.{wsId}` | onWorkspaceScroll debounce 200ms | ✅ scroll 経由で間接更新                                                   |
| `localStorage widget-zoom`                   | configStore.setWidgetZoom 内     | ✅ 直接                                                                    |

## 4.2 退行 risk (high → low 順)

### High risk

#### R1. wheel zoom cursor anchor 化で既存 e2e が落ちる

`widget-zoom.spec.ts` は `data-zoom` 値だけ assert で scroll 位置は見てないが、新実装で wheel 時に scroll が動く副作用が **意図した動き**として加わる。test 自体は通るが、user 体感で「wheel ズームで画面位置がずれる」が混乱の元。
**緩和**: spec doc に「wheel zoom は cursor 起点で anchor 補正される」を明記、user に体感確認。

#### R2. 二重 clamp 撤廃で 5 の倍数でない zoom 値が出現

Settings Panel `現在の拡大率: {configStore.widgetZoom}%` が 73% など中途半端な値表示。`Ctrl+0` で 100 に戻せばクリーンになるので深刻ではないが、user 体感確認必要。
**緩和**: SettingsPanel 表示を `Math.round(zoom)` に統一（Phase 1 で軽微変更可）。

#### R3. `MIN_ZOOM 50→25` への変更で過去保存値の外側にあるユーザーが影響

PR #279 で既に MIN_ZOOM=25 だが、test e2e は `widget-zoom.spec.ts` L121 で「ズーム範囲が 50〜200 にクランプ」と書かれていて 50 が期待値になっている。**test 修正必須**。
**緩和**: e2e test 修正を Phase 1 PR に含める。

### Medium risk

#### R4. `computeInitialScroll` (WorkspaceLayout) と Fit の spec 重複

旧 `computeInitialScroll` は workspace 切替時の初期 scroll を計算 (BB center / canvas center)。Fit が同じ計算を別経路でする。Phase 1 で Fit を直すと、初期 scroll と Fit の挙動が乖離する可能性。
**緩和**: Phase 1 で `computeInitialScroll` も `computeFitScroll` に置き換える (推奨) or Phase 2 に持ち越す (Phase 1 を最小化)。要 user decision。

#### R5. requestAnimationFrame タイミング

stash 版は zoom 変更後 `requestAnimationFrame` で scrollTo。Svelte 5 reactive flush + DOM reflow が rAF 前に終わってる前提。Tauri webview2 で稀に遅延発生する場合あり。
**緩和**: 確認可能なら 2 段 rAF にして安全寄り。Phase 1 後のスモークで実機確認必須。

#### R6. smooth scroll 撤廃

旧 Fit は `behavior: 'smooth'` (600ms 動画的に zoom)。新は `instant`。user 体感「ぴょん」が「ぱっ」に変わる。
**緩和**: spec として user 確認。動画的にしたいなら CSS transition で代替可能だが Phase 1 では instant 推奨。

### Low risk

#### R7. config.svelte.ts の clamp 撤廃で異常値書き込み

caller 漏れで `setWidgetZoom(99999)` を呼ぶと 99999 が永続化される (現在は 200 にクランプ)。
**緩和**: 選択 2 (clampZoom 経由) で defense 残す。Phase 1 推奨。

#### R8. zoom-math.ts MIN_ZOOM 集約で循環 import

`config.svelte.ts` が `zoom-math.ts` を import、`widget-zoom.svelte.ts` が `config.svelte.ts` と `zoom-math.ts` を import。一方向で循環なし。安全。

## 4.3 Phase 2/3 で触る予定の領域に手を入れずに済むか

| Phase 2 で触る領域               | Phase 1 で手をつけるか | 理由                                                     |
| -------------------------------- | ---------------------- | -------------------------------------------------------- |
| 配置の有限性 (cells 24×128 制限) | ❌ 触らない            | DEFAULT_MAX_ROW=128 / dynamicCols 制限はそのまま         |
| DOM grid → CSS transform stage   | ❌ 触らない            | WorkspaceWidgetGrid.svelte / canvasW/H 計算は Phase 2 で |
| widget virtualization            | ❌ 触らない            | 視認外 widget の DOM 切り捨ては Phase 2 で               |

| Phase 3 で触る領域     | Phase 1 で手をつけるか |
| ---------------------- | ---------------------- |
| 複数 widget 選択       | ❌ 触らない            |
| 一括移動 / 一括 resize | ❌ 触らない            |

→ Phase 1 は **zoom math と caller の薄い orchestration のみ**で完結。Phase 2/3 領域には手を入れない。

## 4.4 Phase 2 への影響

Phase 2 で DOM grid → CSS transform stage に書き直すとき、zoom-math.ts の関数群はそのまま再利用できる:

- `cellStrideX/Y` は CSS transform でも cell 間隔として使える
- `computeBoundingBox` / `computeOrigin` は座標系不変
- `computeZoomAnchorScroll` は scrollLeft/Top → CSS translate に変換するだけ

→ Phase 1 の zoom-math.ts は Phase 2 で **そのまま流用可能**な設計になっている (stash 版確認済)。

## 4.5 後方互換

- `localStorage widget-zoom` 既存値はそのまま読める (clampZoom が異常値を 25-200 に補正)
- `localStorage arcagate.workspace.pan.*` 既存値はそのまま読める (Phase 1 で scroll 構造変更なし)
- DB 保存形式変更なし (zoom は localStorage のみ)
- IPC 変更なし

## 4.6 切り戻し容易性

git revert 1 commit (Phase 1 PR) で完全切り戻し可能。pure function 群が独立しているので部分 revert も可能。
