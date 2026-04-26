---
id: PH-20260426-297
status: done
batch: 68
type: 改善
---

# PH-297: 全画面 button label audit + ラベル原則違反修正 + ウィジェット設定 UX 統一監査

## 参照した規約

- `CLAUDE.md` 哲学節（ラベル原則 / 同機能=同 icon・label / 横展開）
- `docs/desktop_ui_ux_agent_rules.md` P4 補足
- batch-67 PH-291 / PH-294 で制定したラベル原則

## 背景・目的

batch-67 でラベル原則を制定 + LibraryDetailPanel の Star ボタンと Settings サイドバーを fix した。
**横展開原則**に従い、全画面の button / chip / link を audit して違反を全部潰す。

## 監査対象

| 画面                       | 対象                                                           |
| -------------------------- | -------------------------------------------------------------- |
| TitleBar                   | NAV_TOP 経由化済（PH-294 partial）                             |
| LibrarySidebar             | PH-292 で 4 セクション化、SidebarRow ラベル audit              |
| LibraryDetailPanel         | お気に入り済（PH-291）、他 ActionButton（起動/編集/削除）audit |
| LibraryItemTagSection      | 「+ タグを追加」ラベル OK、タグ削除 aria-label audit           |
| LibraryMainArea            | グリッド/リスト切替ボタンの aria-label audit                   |
| WorkspaceLayout / Sidebar  | ウィジェット追加 / 編集モード / リサイズ ボタン audit          |
| Settings*                  | 各カテゴリ内の button audit                                    |
| Palette                    | コマンド項目 / 検索 audit                                      |
| Toast / 通知               | メッセージ自然語 audit                                         |
| Dialog (ItemFormDialog 等) | フォーム button audit                                          |

## 監査チェックリスト

各 button について:

1. ラベル文字 = 機能 / 状態 / アクションか？（アイコン名・記号名禁止）
2. aria-label = 機能ベースか？
3. 同じ機能なら同じ icon + label が他画面と揃っているか？
4. 言語混在（英 + 日）なし？

## ウィジェット設定 UX 統一監査（ユーザフィードバック batch-67 後）

ユーザ指摘「ウィジェット設定ボタン押したら設定モーダルが出るやつ、一部反映されてなかった」。

### 現状調査結果

| ウィジェット         | menuItems                            | 挙動              | 判定                           |
| -------------------- | ------------------------------------ | ----------------- | ------------------------------ |
| **ClockWidget**      | 4 項目（秒/日付/曜日/12-24h トグル） | DropdownMenu 表示 | **❌ 古い挙動、modal 化必要**  |
| FavoritesWidget      | 1 項目「設定」                       | 即モーダル        | ✅                             |
| ItemWidget           | 1 項目「アイテムを変更」             | picker 即起動     | ✅（label 「変更」も意味妥当） |
| ProjectsWidget       | 1 項目「設定」                       | 即モーダル        | ✅                             |
| QuickNoteWidget      | 1 項目「設定」                       | 即モーダル        | ✅                             |
| RecentLaunchesWidget | 1 項目「設定」                       | 即モーダル        | ✅                             |
| StatsWidget          | 1 項目「設定」                       | 即モーダル        | ✅                             |

### 修正

**batch-67 PR #102 commit `167fd17` で前倒し実施済み**:

- ClockWidget.svelte: menuItems 4 → 1 (「設定」)、即モーダル
- WidgetSettingsDialog.svelte: widget_type === 'clock' 分岐 + 4 checkbox（show_seconds / show_date / show_weekday / use_24h）

batch-68 PH-297 では他 audit 観点に集中:

### batch-68 で実施する残 audit

| 観点                                            | 対象                                                                                                            | 期待                                                                         |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| LibrarySidebar の `LayoutDashboard` 直接 import | `src/lib/components/arcagate/library/LibrarySidebar.svelte:2`                                                   | ユーザータグ用 fallback icon は妥当だが、aria-label / 表示が機能ベースか確認 |
| WidgetShell の aria-label `"{title} メニュー"`  | `src/lib/components/arcagate/common/WidgetShell.svelte:41`                                                      | 「メニュー」という単語、機能ベースとして妥当（保留）                         |
| 全 button の aria-label 一覧確認                | grep 結果（PR #102 commit `167fd17` で実施した audit 結果は dispatch-log 参照）                                 | 違反なし、保守                                                               |
| icon 直接 import 残存                           | `Archive` / `LayoutDashboard` / `Settings2` / `Palette` / `Database` / `Volume2` / `Search` を NAV_* 経由化漏れ | LibrarySidebar:2 のみ確認、他は OK                                           |
| Toast / Dialog / Form 内 button                 | 個別確認                                                                                                        | grep 結果から違反なし                                                        |

### 機械化（再発防止）

- E2E: 全ウィジェット種別で「設定ボタン click → 中間メニュー（DropdownMenu）が出ない → モーダルが直接開く」をアサート
- 開発時のチェック観点: 新規ウィジェット追加時に `menuItems` が 2 個以上にならないか確認

## 機械化候補

`scripts/audit-labels.ts`:

```typescript
// AST 解析で <button> 内テキストが lucide icon 名と一致したら警告
// 例: <Star> + 'Star' or '星' → 違反
```

または `eslint-plugin-svelte` カスタムルール検討。

## 修正方針

各違反を 1 commit ずつ:

- `(audit: ラベル原則違反 - LibrarySidebar SidebarRow aria-label が icon 名)`
- 同種パターンを batch で一括修正

## 受け入れ条件

- [ ] 全画面の button / chip / link が監査済み
- [ ] 違反件数を dispatch-log に記録（修正前/後）
- [ ] 機械化スクリプト（簡易でも）実装
- [ ] **ClockWidget が DropdownMenu → settings modal 統合** [Function, U]
- [ ] **全ウィジェット種で `menuItems.length === 1` の「設定」または機能ボタン即実行に統一** [P consistency]
- [ ] **E2E**: 各ウィジェット種で「設定ボタン click → DropdownMenu DOM 非出現 → モーダル DOM 出現」をアサート
- [ ] `pnpm verify` 全通過
