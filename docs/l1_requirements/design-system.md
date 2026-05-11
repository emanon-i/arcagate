# Arcagate デザインシステム

Arcagate 固有のトークン体系・テーマ設計。実装ファイル: `src/lib/styles/arcagate-theme.css`。

---

## トークン階層

**3 層構造:**

1. **Primitive (`--prim-*`)**: 生の色値（gray / cyan / red / amber / emerald）。コンポーネントで直接使用禁止。
2. **Semantic (`--ag-*`)**: 意味論トークン。コンポーネントはこれだけを使う。
3. **Bridge**: `--ag-*` を shadcn-svelte の `--background` / `--foreground` 等に写す変換層。`app.css` に定義。

---

## Semantic トークン一覧（`--ag-*`）

### Surface（7 段階）

```
surface-page  : ページ背景（最下層）
surface-0     : カード・パネルの基地（最も控えめなサーフェス）
surface-1     : ナビゲーション・サイドバー
surface-2     : インライン入力・ホバー状態
surface-3     : 選択・フォーカス状態
surface-4     : アクティブ・押下状態
surface-opaque: backdrop-filter が使えない環境用の不透明フォールバック
```

### Border（3 段階）

```
--ag-border       : 標準ボーダー
--ag-border-hover : ホバー時ボーダー
--ag-border-dashed: 破線（D&D ドロップゾーン等）
```

### Accent（cyan ベース）

```
--ag-accent              : アクセント色本体
--ag-accent-border       : アクセントボーダー
--ag-accent-bg           : アクセント背景
--ag-accent-text         : アクセントテキスト
--ag-accent-active-bg    : アクティブ状態背景
--ag-accent-active-border: アクティブ状態ボーダー
```

セカンダリ・ターシャリアクセントも同様の suffix 体系で存在（`-secondary*`, `-tertiary*`）。

### Tone（warm / success / error）

各 tone で `-border` / `-bg` / `-text` の 3 種類が定義されている。

### Text（4 段階）

```
--ag-text-primary   : 最高視認性（body text）
--ag-text-secondary : 補助テキスト
--ag-text-muted     : 注釈・プレースホルダー
--ag-text-faint     : 最低視認性（無効状態等）12px 以下での使用禁止
```

### Shadow（5 段階）

```
--ag-shadow-none
--ag-shadow-sm     : ホバーカード
--ag-shadow-md     : フロートメニュー
--ag-shadow-dialog : ダイアログ
--ag-shadow-palette: コマンドパレット
```

### Radius（8 段階）

```
--ag-radius-chip / button / input / card / widget / window / palette / keyhint
```

### Motion（Duration / Easing は ux-standards.md 参照）

### Card sizing

```
--ag-card-w-s / -m / -l
--ag-card-gap
```

### Background layers

```
--ag-backdrop : backdrop-filter 値（テーマごとに異なる）
```

---

## テーマアーキテクチャ

### テーマ種別

```
BaseTheme（CSS クラス）
  ├── dark  → .dark クラスをトグル
  └── light → .dark クラスを除去

BuiltinCustomTheme（DB 保存 + data-theme セレクタで構造 CSS 適用）
  ├── Endfield       (dark ベース: 深青灰 + ノイズテクスチャ)
  ├── Ubuntu Frosted (dark ベース: Frosted Glass)
  └── Liquid Glass   (dark ベース: backdrop-filter)

UserCustomTheme（DB 保存）
  └── ユーザが css_vars JSON を編集したテーマ
```

### 適用フロー

1. `applyTheme()` が `css_vars` JSON を `:root` に `el.style.setProperty()` で展開
2. `el.dataset.theme = activeMode` を設定 → `[data-theme="..."]` セレクタが構造 CSS を適用
3. `backdrop-filter` など CSS 変数で設定できないプロパティは `[data-theme]` 側で定義

### BuiltinTheme の格納

`src-tauri/migrations/01N_*.sql` で `INSERT OR IGNORE` として DB に seed。

### テーマエディタ（Settings > Appearance > ThemeEditor）

- `css_vars` を color picker / text input で調整、変更は即時 CSS var に反映
- 51 変数を ThemeEditor に表示（DB にない変数は `getComputedStyle` でデフォルト値を補完）
- ビルトインテーマは「コピーして編集」で UserCustomTheme として保存
- エクスポート: clipboard + JSON ファイル / インポート: JSON 貼り付け + ファイル選択

### 外部テーマ（将来計画）

`%APPDATA%/arcagate/themes/<name>/manifest.json + theme.css` をスキャン予定。

---

## 背景レイヤ合成モデル

```
Layer 5: UI コンテンツ
Layer 4: Frosted Glass（backdrop-filter: blur(12px) saturate(180%)）
Layer 3: ノイズテクスチャ（SVG feTurbulence / --ag-bg-noise）
Layer 2: 等高線コンタ（オプション）
Layer 1: 壁紙 / グラデーション背景
Layer 0: ソリッド背景色（フォールバック）
```

Frosted Glass 実装例:

```css
.frosted-panel {
  background: rgba(10, 14, 20, 0.7);
  backdrop-filter: blur(12px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
```

---

## color hardcode 禁止

コンポーネントで `#rrggbb` / `rgba(...)` / Tailwind カラークラス（`bg-cyan-400` 等）を直接書かない。必ず `var(--ag-*)` を経由する。pre-commit `design-tokens` hook で機械的に検出される。
