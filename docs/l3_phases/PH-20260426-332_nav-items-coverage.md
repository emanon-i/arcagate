---
id: PH-20260426-332
status: todo
batch: 75
type: 改善
---

# PH-332: nav-items.ts カバレッジ拡張（Settings 内ナビ + 画面内タブ）

## 横展開チェック実施済か

- batch-67 で `src/lib/nav-items.ts` を作成 → NAV_TOP / NAV_SETTINGS の 2 リスト
- 同じ機能 = 同じ icon + 同じラベル原則を実装したが、各画面の二次タブまでは網羅していない
- batch-74 で Library detail panel と Workspace sidebar の lucide icon 名直書きを発見した（PaletteQuickContext 等）

## 仕様

- nav-items.ts に NAV_LIBRARY_TABS / NAV_WORKSPACE_TABS / NAV_PALETTE_SECTIONS を追加
- 各画面で hardcoded icon + label を nav-items 経由に置換
- TS 型で「許可されたナビ項目だけ」表示できるように（Component 型 + 文字列 key）

## 受け入れ条件

- [ ] nav-items.ts に最低 2 つの新 group 追加
- [ ] 各画面が nav-items を import
- [ ] grep で「icon: Star」等 hardcoded icon が nav-items.ts 以外にないことを確認
- [ ] `pnpm verify` 全通過
