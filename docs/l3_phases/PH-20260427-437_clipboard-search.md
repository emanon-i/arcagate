---
id: PH-20260427-437
status: done
batch: 96
type: 改善
era: Polish Era 完走判定 + 機能拡張
---

# PH-437: ClipboardHistory 検索 (Nielsen H7)

## 問題

use-case-friction-v2 case 6 H7 severity 3:
ClipboardHistory widget で 100+ 件履歴を目視のみ。Raycast / Ditto は検索完備。

## 改修

`ClipboardHistoryWidget.svelte`:

- 検索 input 追加 (上部、Search icon + X クリアボタン)
- query state 追加、`entries.filter((e) => e.text.toLowerCase().includes(q))` で部分一致
- max_items 設定との併用 (検索結果も max_items でクランプ)
- 検索中の hint「N 件中 M 件表示」

## 受け入れ条件

- [ ] 検索 input + クリアボタン
- [ ] 部分一致フィルタ (case-insensitive)
- [ ] N 件中 M 件 hint
- [ ] vitest 1 ケース (filter ロジック)
- [ ] `pnpm verify` 全通過
