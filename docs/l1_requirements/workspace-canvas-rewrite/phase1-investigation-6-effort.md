# §6 工数見積

実装フェーズの想定時間。Phase 1 のみ (Phase 2/3 は別見積)。

## 6.1 タスク別

| #  | タスク                                                                                                | 想定   |
| -- | ----------------------------------------------------------------------------------------------------- | ------ |
| 1  | stash@{0} pop + conflict 解消 (main は PR #281 まで含む)                                              | 15 min |
| 2  | `zoom-math.ts` の `computeZoomAnchorScroll` に anchor 引数追加                                        | 20 min |
| 3  | `zoom-math.test.ts` を 2 file 分割 + cursor anchor test 3 件追加                                      | 45 min |
| 4  | `widget-zoom.svelte.ts` で wheel cursor anchor 実装 + MIN_ZOOM 集約                                   | 30 min |
| 5  | `config.svelte.ts` 修正 (clampZoom 経由、defense in depth)                                            | 15 min |
| 6  | `WorkspaceLayout.svelte` の `computeInitialScroll` を Fit と統一 (要 user OK)                         | 30 min |
| 7  | `tests/e2e/widget-zoom.spec.ts` MIN_ZOOM 50→25 修正                                                   | 5 min  |
| 8  | `tests/e2e/canvas-pan-zoom.spec.ts` に 3 ケース追加 (Reset / Fit / wheel anchor)                      | 60 min |
| 9  | `docs/l1_requirements/ux_standards.md` §13 spec 追記                                                  | 20 min |
| 10 | `pnpm verify` 全段 pass 確認 (biome / dprint / clippy / rustfmt / svelte-check / cargo test / vitest) | 15 min |
| 11 | dev で実機 CDP 5 シナリオ screenshot 検証                                                             | 60 min |
| 12 | `/run-codex review` で二次レビュー                                                                    | 15 min |
| 13 | PR 作成 + 説明文 + screenshot 添付                                                                    | 20 min |
| 14 | user 検収待ち中の HMR 修正 (見込み)                                                                   | 30 min |

合計 約 6 時間 / Plan 化 + 実装 + 検証 + PR まで。

## 6.2 user decision で増減する箇所

| user decision                             | 重い場合                      | 軽い場合             |
| ----------------------------------------- | ----------------------------- | -------------------- |
| `computeInitialScroll` を Phase 1 で統一? | +30 min (タスク 6)            | 0 (Phase 2 持ち越し) |
| `config.setWidgetZoom` に clamp 残す?     | 0 (現状維持に近い)            | +5 min (caller 信頼) |
| smooth scroll 維持?                       | +20 min (transition で代替)   | 0 (instant)          |
| 5 単位 round を Settings 表示で残す?      | +10 min (display round のみ)  | 0 (round せず表示)   |
| MIN_ZOOM をさらに下げる (15% / 10%)?      | +5 min (定数変更 + test 更新) | 0 (25% 維持)         |

## 6.3 Phase 全体ロードマップ (参考)

| Phase          | スコープ                                                           | 想定       |
| -------------- | ------------------------------------------------------------------ | ---------- |
| **Phase 1**    | zoom math 書き直し (今回)                                          | 6 時間     |
| Phase 2        | 配置の有限性撤廃 + DOM grid → CSS transform stage + virtualization | 16-24 時間 |
| Phase 3        | 複数 widget 選択 + 一括編集                                        | 8-12 時間  |
| Phase 4 (任意) | 操作 UX 微調整 (Codex review 等のフィードバック反映)               | 4-6 時間   |

合計 約 35-50 時間 (workspace canvas 抜本書き直し全体)。

## 6.4 Phase 1 開始前の user sign-off 待ち項目

実装に入る前に user 確認が必要な5件:

1. **Wheel zoom anchor を cursor にするか viewport center にするか**
   → 業界標準は cursor。Phase 1 で採用するなら e2e 追加必要。
2. **`config.setWidgetZoom` に clamp 残すか 完全 caller 信頼か**
   → 安全なのは clamp 残す (zoom-math.clampZoom 経由)。
3. **`computeInitialScroll` を Phase 1 で Fit と統一するか Phase 2 に持ち越すか**
   → 統一推奨だが Phase 1 を最小化したいなら持ち越し可。
4. **smooth scroll 維持か instant か**
   → instant 推奨 (timing race 排除)。
5. **Settings 表示の zoom 値を 5 単位丸めで表示するか raw 値で表示するか**
   → raw 値 (Math.round) 推奨 (drift なし)。

→ §0 (TOP doc) の「重要事項」と同じ 5 項目。**user 5 件回答 → Plan 化 → 実装着手** の順。

## 6.5 ブロッカー / 不明点

- なし。コード read で全 callsite が把握済、stash@{0} に書き直し雛形あり、業界標準も調査済 → Plan 化に必要な情報は揃っている。
