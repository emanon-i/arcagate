---
id: PH-20260425-275
status: todo
batch: 64
type: 改善
---

# PH-275: ウィジェット UX 緊急修正（サイズ追従 + 設定モーダル統一 + 即時反映）

## 参照した規約

- `@docs/l1_requirements/ux_standards.md`: §2 レイアウト規約（flex fill・min-h-0）
- `@docs/desktop_ui_ux_agent_rules.md`: §3 ウィジェット設定 UX 統一
- `arcagate-engineering-principles.md` §6 SFDIPOT: Function（設定→表示連動）/ Time（即時性）/ Interface（設定 UX 統一）

## 背景・目的

ユーザ報告: Quick Note・Item Widget・Clock すべてで「ウィジェットサイズとコンテンツ表示サイズが揃わない」「設定を変えてもワークスペース切替後にしか反映されない」「設定の出し方がバラバラ」が発生。

SFDIPOT の **Function**（設定変更 → 表示変化）と **Time**（即時反映）の根本的な観点漏れ。

## 作業内容

### A. コンテンツ ↔ コンテナサイズ追従

全ウィジェットの内部コンテンツを外枠に追従させる CSS 規約:

```css
/* WidgetShell がコンテナを管理 */
.widget-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-h: 0; /* overflow 抑制 */
  overflow-y: auto;
}
```

対象ウィジェット:

- `QuickNoteWidget.svelte`: テキストエリアを `flex-1 min-h-0` で外枠 fill
- `ItemWidget.svelte`: アイテムリストを `flex-1 overflow-y-auto` で外枠 fill
- `ClockWidget.svelte`: 時計表示を `flex-1 items-center justify-center` で中央 fill
- `FavoritesWidget.svelte`: リストを `flex-1 overflow-y-auto`
- `ProjectsWidget.svelte`: リストを `flex-1 overflow-y-auto`
- `RecentLaunchesWidget.svelte`: リストを `flex-1 overflow-y-auto`

### B. 設定変更の即時反映

現状: ウィジェット config が store に反映されてもコンポーネントが再レンダーされない。

調査・修正対象:

1. `widget-config.ts` の config update → store reactivity 経路の確認
2. `WidgetSettingsDialog` close 時に config を store に push する処理の確認
3. `$effect` / `$derived` の dependency が正しく通っているか確認
4. `workspaceStore.getWidgetConfig()` を reactive にする（必要なら store 内で `$state` 管理）

### C. 設定 UX の統一

全ウィジェットで同じ操作で設定にアクセスできるようにする:

- 編集モード（鉛筆アイコン表示時）に歯車ボタンを全ウィジェットのヘッダーに表示
- クリック → `WidgetSettingsDialog` を開く（既存コンポーネントを活用）
- 設定がないウィジェットでは歯車を非表示（現状通り）

### D. Quick Note フォントサイズ設定追加

ユーザ要望: Quick Note のフォントサイズ調整。`QuickNoteWidget` の settings スキーマに `fontSize: 'sm' | 'md' | 'lg'` を追加し、textarea に反映。

## 成果物

- 全ウィジェット CSS 修正（flex fill 統一）
- `workspaceStore` / widget config の reactivity 修正
- Quick Note settings に fontSize 追加
- 設定歯車ボタンを全ウィジェットに統一表示

## 受け入れ条件

- [ ] QuickNote のテキストエリアがウィジェット高さに追従する [Function, U]
- [ ] Item Widget のリストがウィジェット高さに追従する [Function, U]
- [ ] Clock がウィジェットサイズ中央に収まる [Function, U]
- [ ] 設定変更後、ワークスペース切替なしで即反映される [Time, U]
- [ ] 全ウィジェットで編集モード中に歯車ボタンが表示される [P consistency]
- [ ] Quick Note でフォントサイズ設定が効く [Function]
- [ ] `pnpm verify` 全通過
