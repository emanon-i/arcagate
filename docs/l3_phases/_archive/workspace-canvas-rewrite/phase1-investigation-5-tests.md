# §5 テスト戦略

## 5.1 既存 test の状況

### unit (vitest)

- `widget-grid.test.ts` 18 件 / pass
- `zoom-math.test.ts` ... **存在せず** (stash@{0} に WIP +288 行)
- 他 zoom 関連 unit test なし

### e2e (Playwright)

| spec                                     | カバレッジ                                               | Phase 1 で要修正?               |
| ---------------------------------------- | -------------------------------------------------------- | ------------------------------- |
| `widget-zoom.spec.ts` (3 tests)          | wheel zoom 段階変化 / localStorage 永続化 / clamp 50-200 | **要修正** (clamp 25-200 へ)    |
| `canvas-pan-zoom.spec.ts` (3 tests)      | smoke / Ctrl+0 で zoom 100% / toolbar 4 button 存在      | **要拡張** (anchor 動作 assert) |
| `workspace-editing.spec.ts` (1 箇所参照) | data-zoom 属性 read                                      | 影響軽微                        |

→ e2e は **scroll 位置を assert していない**。Phase 1 の中核 (anchor 補正) の動作保証が e2e で取れていない。

## 5.2 Phase 1 で書く test

### Tier 1: pure function unit test (zoom-math.test.ts)

stash@{0} に WIP 済 (288 行)。**そのまま採用可能**。カバー範囲:

| 関数                      | test ケース                     | stash 既存 | Phase 1 追加                 |
| ------------------------- | ------------------------------- | ---------- | ---------------------------- |
| `clampZoom`               | 5 ケース                        | ✅         | —                            |
| `cellStrideX/Y`           | 100% / 50% / 33%                | ✅         | —                            |
| `computeBoundingBox`      | empty / single / multi          | ✅         | —                            |
| `computeOrigin`           | 整数 / 小数                     | ✅         | —                            |
| `computeZoomAnchorScroll` | viewport center anchor 5 ケース | ✅         | **+ cursor anchor 3 ケース** |
| `computeFitZoom`          | 4 ケース                        | ✅         | —                            |
| `computeFitScroll`        | 3 ケース                        | ✅         | —                            |
| Fit→Reset integration     | 連続シナリオ                    | ✅         | —                            |

**Phase 1 で追加したい**:

- `computeZoomAnchorScroll(anchor=cursor)` の 3 ケース (cursor 左上 / 中央 / 右下)
- 5 単位 round 撤廃で 73% の zoom を扱う 1 ケース
- BB が viewport より小さいときの Fit (zoom が 200% capped にならず元 zoom 維持) 1 ケース

→ 200 行制約のため `zoom-math.test.ts` (基本) と `zoom-math-anchor.test.ts` (anchor / integration) に分割。

### Tier 2: e2e test 修正 + 追加

#### 修正

- `widget-zoom.spec.ts` L121 「ズーム範囲が 50〜200 にクランプ」 → 「25〜200」 (1 行修正)

#### 追加 (Phase 1 で書きたい)

- **A**: Reset zoom (Ctrl+0) 後、widget 配置 が viewport 中央付近に保たれる ことを assert (data-zoom=100 + scrollLeft / scrollTop が 0 でないこと、または既存 widget の clientRect が viewport 内に入っている)
- **B**: Fit-to-content (Ctrl+Shift+1) 後、全 widget の clientRect が viewport 内に入る ことを assert
- **C**: wheel zoom (cursor anchor) で cursor 下の cell が同じ pixel 位置に留まる ことを assert (cursor 位置 → wheel → 同じ cursor 位置の widget が変わらない)

→ 3 tests (~150 行) を `canvas-pan-zoom.spec.ts` に追加。

### Tier 3: 実機 (CDP) screenshot 検証

実機で 5 シナリオ:

1. **Reset 前 / 後**: zoom 50% で scroll 中央 → Reset → zoom 100% で同じ視点に居る
2. **Fit 前 / 後 (1 widget)**: zoom 200% pan 端 → Fit → zoom 100% (BB 余裕) で widget 中央
3. **Fit 前 / 後 (10 widgets)**: zoom 100% → Fit → zoom 50% で全 widget 表示
4. **Fit 前 / 後 (50 widgets 大 BB)**: zoom 100% → Fit → zoom 25% (clamp) で全 widget
5. **wheel zoom anchor**: cursor を widget A 上に置いて Ctrl+wheel up → widget A が cursor 下に居続ける

各シナリオで before/after screenshot を `/tmp/redo3-shots/` 保存 → Read で目視。

## 5.3 数値検証マトリクス (実装後の e2e 検証用)

Reset / Fit 後の zoom + scroll を CDP eval で測定し spec と比較:

| シナリオ                               | 期待 zoom   | 期待 scrollLeft   | 期待 scrollTop    |
| -------------------------------------- | ----------- | ----------------- | ----------------- |
| 初期 (空 workspace)                    | 100         | canvas center     | canvas center     |
| Reset @ zoom 50, scroll(100,200)       | 100         | (100+W/2)*2 - W/2 | (200+H/2)*2 - H/2 |
| Fit (1 widget at (5,5) w=2 h=2)        | 200 (clamp) | 適切な計算値      | 適切な計算値      |
| Fit (BB 巨大)                          | 25 (clamp)  | 計算値            | 計算値            |
| wheel @ cursor (300,200), zoom 100→110 | 110         | 計算値            | 計算値            |

→ 数値が spec とぴったり一致するか を CDP で測定する eval スクリプトを `E:/tmp/eval-zoom-verify.js` として用意。

## 5.4 Codex secondary review

Phase 1 実装完了後、`/run-codex review src/lib/state/widget-zoom.svelte.ts src/lib/utils/zoom-math.ts` で二次レビュー。MIN/MAX clamp / float 精度 / Math.round の rounding rule (half-to-even 等) で見落としがないか確認。

## 5.5 退行検出

CI 全 pass 後、user dev 検収まで:

1. 既存 e2e (widget-zoom + canvas-pan-zoom) ... 修正版が pass
2. 既存 vitest 192 件 ... 全 pass 維持
3. 新 zoom-math.test.ts ... pass
4. 新 e2e 3 件 ... pass
5. 実機 5 シナリオ screenshot ... user 目視検収

5 つ全部 OK で「治った」判定。screenshot だけ / 数値だけは不可 (Rule 再確認)。

## 5.6 test 実行順序の規律

実装フェーズで:

1. zoom-math.ts と test を**先に**書いて vitest pass
2. widget-zoom.svelte.ts 書き直し → vitest 再 pass
3. config.svelte.ts 修正 → svelte-check 0 errors
4. e2e 修正 + 追加 → ローカル e2e pass (Tauri dev で `pnpm test:e2e`)
5. 実機 CDP 5 シナリオ screenshot
6. Codex review
7. PR 作成

順序を守ることで「test pass = code 動く」「screenshot = 体感 OK」を分離して保証。
