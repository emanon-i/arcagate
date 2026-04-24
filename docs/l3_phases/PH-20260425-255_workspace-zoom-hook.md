---
id: PH-20260425-255
status: todo
batch: 60
type: 改善
---

# PH-255: WorkspaceLayout ズームロジック hook 抽出

## 背景・目的

`WorkspaceLayout.svelte`（310行）にズーム操作ロジック（ホイールイベント・
クランプ処理・設定永続化）が混在している。`useWidgetZoom.svelte.ts` に抽出して
コンポーネントを薄くする。

## 実装ステップ

### Step 1: `useWidgetZoom.svelte.ts` 作成

`src/lib/state/widget-zoom.svelte.ts` を新規作成。

インターフェース:

```typescript
export function useWidgetZoom(): {
    widgetZoom: number;  // $derived
    handleWheelZoom: (e: WheelEvent) => void;
}
```

移動するコード:

- `configStore.widgetZoom` を読む `$derived`
- `onwheel` イベントハンドラ（Ctrl+スクロールでズーム）
- ズーム値のクランプ・`configStore.setWidgetZoom()` 呼び出し

### Step 2: `WorkspaceLayout.svelte` 修正

- `useWidgetZoom` を import
- ズーム関連コードを削除し hook 結果を使用

### Step 3: pnpm verify

## 受け入れ条件

- [ ] `WorkspaceLayout.svelte` が 270行以下になる
- [ ] `widget-zoom.svelte.ts` が新規作成される
- [ ] Ctrl+ホイールズームが動作する
- [ ] `pnpm verify` 全通過
