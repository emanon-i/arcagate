---
id: PH-issue-006
title: Widget collection 型 default + 削除 cascade
status: planning
parent_l1: REQ-006_workspace-widgets
related: 旧 PH-474 (item picker collection)、rollback で revert
---

# Issue 6: Widget Collection 型 + cascade 削除

## 元 user fb (検収項目 #6)

> Widget の default 状態を「アイテムの collection (複数 item を保持)」型にして、widget 削除時に紐付け cascade で自動掃除

## 引用元 guideline doc

| Doc                                                | Section                                   | 採用判断への寄与                                            |
| -------------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------- |
| `docs/l0_ideas/arcagate-engineering-principles.md` | §3 エラーハンドリング / §6 SFDIPOT (Data) | データ整合性、orphan 防止                                   |
| `docs/desktop_ui_ux_agent_rules.md`                | P2 (失敗前提)                             | 削除 cascade の影響範囲が user に分かるように (確認 dialog) |
| `docs/l1_requirements/ux_standards.md`             | §6-1 Widget                               | widget 状態管理                                             |

## Fact 確認 phase

現状: Item Widget は `widget.config` に `item_id: string` を JSON 保存、1 widget = 1 item の単数モデル。

- Picker (PH-issue-005) で複数選択導入 → collection 型 (`item_ids: string[]`) へ拡張が必要
- 削除 cascade: widget 削除時に DB の workspace_widgets 行は消えるが、各 widget の `config.item_ids` 参照は固有資料、orphan ではない (item は library に残る)
- 逆方向: Library で item 削除 → widget 内の参照 item_id が orphan に → 表示時に "削除済" placeholder

## UX 本質 phase

User 「collection + cascade」 =

1. **collection 型 default**: Picker 導入後の「複数 item を 1 widget に紐付け」が自然な default
2. **削除 cascade**:
   - widget 削除: workspace_widgets 行削除 → config 自動解除 (現状動作)
   - item 削除: Library から item 削除 → 各 widget の config.item_ids から該当 ID を **自動除去** (新規)
   - 確認 dialog: 「この item は X 個の Widget で参照されています、削除すると widget からも消えます」(P2 失敗前提)

## 横展開 phase

| 領域                                               | 対応                                                       |
| -------------------------------------------------- | ---------------------------------------------------------- |
| `WidgetConfig` 型 (各 widget の TS interface)      | `item_ids: string[]` を default 採用                       |
| Item Widget                                        | 単数 → 複数表示 (LibraryCard グリッドで 1〜N item 表示)    |
| `cmd_delete_item` (Rust)                           | item 削除時に全 widget config をスキャンして該当 ID を除去 |
| Library 画面の delete confirm                      | 影響 widget 数を表示 (P2)                                  |
| 他 widget (Snippet / DailyTask / ClipboardHistory) | 内部 list 構造、cascade 不要 (item 参照無し)               |

## Plan: 採用案 A: 「config.item_ids[] + Rust cascade 処理」

**Rust 側**:

- `cmd_delete_item(id)` 内で全 workspace_widgets を scan、`config` JSON に item ID 含めば配列から除去 + UPDATE
- 削除前に「影響 widget 数」を返す `cmd_count_item_references(id) -> usize` を新設、UI 側で確認 dialog 用

**TS 側**:

- WidgetConfig 型: `item_ids?: string[]` (旧 `item_id: string` 互換のため optional)
- Item Widget render: `config.item_ids.map(...)`、1 個も無ければ空 state
- Library delete confirm: 影響数取得 → 「N 個の Widget で使われています、削除しますか？」

## 棄却案 B: 「orphan ID は表示時に skip、cascade しない」

- DB に orphan が貯まり続ける、容量増 / 一貫性低下
- → 棄却

## 棄却案 C: 「FK 制約で DB 側の自動 cascade」

- workspace_widgets.config は JSON、FK 不可 (SQL 制約付けられない)
- → 棄却

## E2E 1 シナリオ

- `tests/e2e/widget-item-cascade.spec.ts`:
  - Item A を 2 widget に紐付け → Library で A 削除 → 確認 dialog 「2 個の widget」 → 削除 → 両 widget で A が消える

## 規格 update

`ux_standards §6-1` に「Item Widget は collection 型 (1〜N item)、削除時 cascade」明記。

## 実装ステップ

1. `cmd_count_item_references` IPC 新設 (workspace_widgets を scan)
2. `cmd_delete_item` 内で cascade (全 widget config 更新)
3. WidgetConfig TS 型: `item_ids` 追加
4. ItemWidget の render を複数対応
5. Library delete confirm dialog 拡張 (影響 widget 数表示)
6. E2E spec
7. ux_standards §6-1 update

依存: PH-issue-005 (Picker = LibraryCard) **後** に着手 (Picker で複数選択前提のため)
