---
id: PH-20260426-305
status: done
batch: 70
type: 改善
---

# PH-305: Canvas パン操作（ミドルクリック / Space+drag / 編集中スクロールバー非表示）

## 横展開チェック実施済か

- 既存 `WorkspaceLayout.svelte` / `WorkspaceWidgetGrid.svelte` の D&D / リサイズ実装と統合判断
- `lessons.md`「PointerEvent と page.mouse の競合」「PointerEvent D&D 全面移行」記録を踏襲
- LibraryMainArea 等の他 scroll コンテナで「編集中のスクロールバー非表示」が他にも要るか確認 → Workspace canvas 専用と判断（横展開不要）
- `setPointerCapture` を使う既存コードは batch-16 の対応がある、同パターン適用

## 参照した規約

- `docs/desktop_ui_ux_agent_rules.md` P5 OS 文脈（Figma / Excalidraw / Miro 標準挙動）
- `arcagate-engineering-principles.md` §6 SFDIPOT Operations / Platform
- `lessons.md` Playwright PointerEvent 注意点

## 背景・目的

ユーザ要望「Figma / Excalidraw / Miro / Obsidian Canvas 標準のミドルクリックパン + Space+drag」。
編集モード中に canvas が広がると見渡しが必要、現状はブラウザ scroll のみで滑らかさ・手感が不足。

## 仕様

### A. ミドルクリック (button=1) drag でパン

```typescript
function onPointerDown(e: PointerEvent) {
    if (e.button === 1 || (e.button === 0 && spacePressed)) {
        e.preventDefault();
        panState.active = true;
        panState.startX = e.clientX;
        panState.startY = e.clientY;
        panState.scrollStartX = canvas.scrollLeft;
        panState.scrollStartY = canvas.scrollTop;
        canvas.setPointerCapture(e.pointerId);
        canvas.style.cursor = 'grabbing';
    }
}

function onPointerMove(e: PointerEvent) {
    if (!panState.active) return;
    canvas.scrollLeft = panState.scrollStartX - (e.clientX - panState.startX);
    canvas.scrollTop = panState.scrollStartY - (e.clientY - panState.startY);
}

function onPointerUp(e: PointerEvent) {
    if (!panState.active) return;
    panState.active = false;
    canvas.releasePointerCapture(e.pointerId);
    canvas.style.cursor = spacePressed ? 'grab' : '';
}
```

### B. Space キー押下で grab cursor

```typescript
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !inputFocused) {
        e.preventDefault();
        spacePressed = true;
        canvas.style.cursor = 'grab';
    }
});
window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
        spacePressed = false;
        if (!panState.active) canvas.style.cursor = '';
    }
});
```

入力欄フォーカス時は無効。

### C. 編集中スクロールバー非表示

編集モード時に canvas に `.canvas-edit-mode` class、CSS で:

```css
.canvas-edit-mode {
    scrollbar-width: none; /* Firefox */
}
.canvas-edit-mode::-webkit-scrollbar {
    display: none;
}
```

通常モードでは標準スクロールバー維持。

### D. 慣性スクロールなし、即応

`scrollLeft / scrollTop` 直接書き込み（CSS smooth-scroll 不使用）。

### E. afterEach guard（lessons.md 参照）

E2E テストで `page.mouse.up()` を必ず afterEach、Tauri ウィンドウのマウス占有事故を避ける。

## 受け入れ条件

- [ ] middle-button drag で canvas が pan する [Function, Operations]
- [ ] Space + 左 drag でも pan [Operations]
- [ ] 入力欄フォーカス中は Space pan 無効 [Function]
- [ ] 編集モード中はスクロールバー非表示 [Image]
- [ ] cursor 変化（grab / grabbing） [U]
- [ ] 慣性なし、scroll 即応 [Time]
- [ ] `pnpm verify` 全通過

## 自己検証

- 編集モード入って middle drag → 視点移動
- Space + 左 drag → 同上
- カードドラッグ（左 button）と pan が衝突しない
- 入力欄でスペース打って pan が起きない
