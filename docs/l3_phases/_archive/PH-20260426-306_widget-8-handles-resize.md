---
id: PH-20260426-306
status: done
batch: 70
type: 改善
---

# PH-306: ウィジェット 8 ハンドルリサイズ + 選択枠スタイル改善

## 横展開チェック実施済か

- 既存 `WorkspaceWidgetGrid.svelte` のリサイズハンドル（4 個 or 1 個？）を grep 確認 → 8 個に統一
- `setPointerCapture` 利用（lessons.md「PointerEvent と page.mouse の競合」回避）
- ハンドルスタイルは shadcn / 既存 token に寄せる（「同じ機能 = 同じスタイル」原則）
- E2E は既存 `tests/e2e/workspace-editing.spec.ts` のリサイズパターン踏襲

## 参照した規約

- `docs/desktop_ui_ux_agent_rules.md` P12「美しさは独自性より整合性」
- `lessons.md` PointerEvent dispatch ベース drag pattern
- 競合分析: Obsidian Canvas / Figma / Excalidraw / Miro / Notion

## 背景・目的

現状はリサイズハンドル数 / 見え方が不統一。8 ハンドル化（4 corner = 自由 + 4 edge = 軸固定）で操作粒度を上げる。

## 仕様

### 8 ハンドルの方向

| 方向 | カーソル    | 制約              |
| ---- | ----------- | ----------------- |
| n    | ns-resize   | 上端のみ（高さ）  |
| s    | ns-resize   | 下端のみ（高さ）  |
| e    | ew-resize   | 右端のみ（幅）    |
| w    | ew-resize   | 左端のみ（幅）    |
| ne   | nesw-resize | 自由（幅 + 高さ） |
| nw   | nwse-resize | 同上              |
| se   | nwse-resize | 同上              |
| sw   | nesw-resize | 同上              |

### スタイル

- **編集モード時に薄く常駐**（透明度 30%）→ ホバーで 100%（Excalidraw / Figma 風）
- ハンドル: 8px × 8px、`var(--ag-radius-sm)`、border 1px、bg `var(--ag-surface-0)`、shadow sm
- 選択枠（active widget）: 1px solid `var(--ag-accent)` + ring offset 2px
- 非選択 widget: ハンドル非表示

### PointerEvent 実装

`page.mouse` ではなく PointerEvent dispatch（lessons.md batch-16 の教訓）:

```typescript
function startResize(e: PointerEvent, dir: ResizeDir) {
    e.stopPropagation();
    e.preventDefault();
    handle.setPointerCapture(e.pointerId);
    state = { dir, startX: e.clientX, startY: e.clientY, w0: width, h0: height, x0: x, y0: y };
}
```

### snap to grid

既存 grid step（CSS var）を踏襲、step 単位で snap。

### キャンセル

Esc 押下でリサイズ中の操作を取り消し（state 復元）。

## 受け入れ条件

- [ ] 8 ハンドル全方向で動作 [Function]
- [ ] cursor が方向別に変化 [U]
- [ ] 非選択 widget はハンドル非表示 [Function]
- [ ] grid step で snap [Data]
- [ ] Esc でキャンセル [Operations]
- [ ] PointerEvent dispatch で実装（page.mouse 競合回避） [Platform]
- [ ] `pnpm verify` 全通過

## 自己検証

- 8 方向 resize 全部試す
- スクショで cursor 変化確認
- 非選択時にハンドルが見えない
