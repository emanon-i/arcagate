---
id: PH-20260427-381
status: todo
batch: 85
type: 改善
era: Refactor Era / 性能フェーズ
---

# PH-381: vite-bundle-visualizer + dynamic import で chunk 削減

## 参照した規約

- `docs/l0_ideas/arcagate-engineering-principles.md` §5 依存予算 / バンドル計測
- batch-82 計測 baseline: フロント raw 556 KB / gzip 150 KB
- batch-84 simplify レビュー指摘: `widgets/index.ts` の `import.meta.glob({ eager: true })` で全 widget Settings がメイン bundle に同梱

## 横展開チェック実施済か

- ThemeEditor / ItemFormDialog / WidgetSettingsDialog 等の重い dialog は Workspace 起動時には不要
- batch-49 で導入した ThemeEditor は 50KB+ の純粋 dialog コード、設定画面を開くまで不要
- 既存 lazy import は palette のみ

## 仕様

### 計測

```powershell
pnpm vite-bundle-visualizer
# treemap を tmp/bundle-batch85.html に保存
```

### 削減候補

候補 1: **WidgetSettingsDialog の Settings 群を lazy 化**

- `widgets/<name>/index.ts` で `SettingsContent: () => import('./<Name>Settings.svelte')` 化検討
- ただし Svelte 5 の `Component<any, any, any>` 型と整合する dynamic import wrapper が必要
- 効果: dialog を開くまで Settings コンポーネントを load しない

候補 2: **ThemeEditor を dynamic import 化**

- SettingsPanel から `await import('$lib/components/settings/ThemeEditor.svelte')` で load
- 効果: 通常使用時に ThemeEditor の重量（CSS var エディタ + JSON IO）を避ける

候補 3: **ItemFormDialog の lazy 化**

- Library から「+ アイテム追加」を押した時にのみ load

### 計測 + 判断

各候補の before/after を計測し、**raw - 50KB or gzip - 15KB** 以上の削減があるもののみ採用。
過度な lazy 化は first-paint 後のジャンプを生むので、「使う前 ≦ 200ms 内」の遅延に収まる範囲のみ。

## 受け入れ条件

- [ ] vite-bundle-visualizer 出力を performance-baseline.md に treemap snapshot として記録
- [ ] 1 件以上の lazy 化を実施（または「効果薄で不採用」の判断ログ）
- [ ] フロント raw / gzip サイズ baseline 比較を記録
- [ ] `pnpm verify` 全通過
- [ ] 実機で初回 paint がスムーズ（CDP 経由で確認）

## SFDIPOT 観点

- **F**unction: dialog 機能 regression 0
- **T**ime: 初回 paint 短縮 + dialog open 遅延 ≤ 200ms
- **P**latform: Tauri webview2 で dynamic import が正常動作
