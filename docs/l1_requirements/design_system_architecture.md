# Arcagate デザインシステム拡張設計

作成: 2026-04-23 / 調査バッチ batch-31 (PH-144)

---

## 1. 現行トークン体系の評価

`src/lib/styles/arcagate-theme.css` の `--ag-*` 変数群（2026-04-23 時点）。

### 現行の課題

| 課題                            | 詳細                                                                                |
| ------------------------------- | ----------------------------------------------------------------------------------- |
| トーン体系の不完全さ            | `warm` / `success` はあるが `error` / `info` がない（batch-30 で `error` 追加済み） |
| サーフェス粒度が曖昧            | `surface-0` 〜 `surface-4` の意味論が不明確                                         |
| シャドウ / エレベーション未整備 | `--ag-shadow-dialog` が 1 種類しか定義されていない                                  |
| モーション変数なし              | duration / easing が各コンポーネントにハードコードされている                        |
| 背景合成モデルなし              | 壁紙・テクスチャ・ノイズの重ね方が未定義                                            |

### 現行トークン一覧

```css
/* Surface (5 levels + opaque) */
--ag-surface-page, -0, -1, -2, -3, -4, -opaque

/* Border (3 levels) */
--ag-border, -hover, -dashed

/* Accent (cyan) */
--ag-accent, -border, -bg, -text, -active-bg, -active-border

/* Tone: warm (amber), success (emerald), error (red) ← batch-30 追加 */
--ag-{tone}-border, --ag-{tone}-bg, --ag-{tone}-text

/* Text (4 levels) */
--ag-text-primary, -secondary, -muted, -faint

/* Radii (7 sizes) */
--ag-radius-{chip,button,input,card,widget,window,palette,keyhint}
```

---

## 2. トークン階層拡張設計

### 2-1. プリミティブレイヤ（新設）

実装には手を付けず、設計の基礎となるカラーパレットを定義するだけのレイヤ。

```css
/* Primitive: Gray (Zinc ベース) */
--prim-gray-50 ... --prim-gray-950

/* Primitive: Cyan (Arcagate brand) */
--prim-cyan-300 ... --prim-cyan-700

/* Primitive: Semantic primitives */
--prim-red-400, --prim-amber-400, --prim-emerald-400
```

→ プリミティブは直接使わず、意味論レイヤのトークンを通してのみ参照する。

### 2-2. 意味論レイヤ（`--ag-*` の拡張方針）

#### サーフェス（明確化）

```
surface-page  : ページ背景（最下層）
surface-0     : 最も明るいサーフェス（カード・パネルの基地）
surface-1     : ナビゲーション・サイドバー
surface-2     : インライン入力・ホバー状態
surface-3     : 選択・フォーカス状態
surface-4     : アクティブ・押下状態
surface-opaque: backdrop-filter が使えない環境用の不透明サーフェス
```

#### エレベーション / シャドウ（追加）

```css
--ag-shadow-none
--ag-shadow-sm      /* ホバーカード */
--ag-shadow-md      /* フロートメニュー・ドロップダウン */
--ag-shadow-dialog  /* ダイアログ・モーダル（既存） */
--ag-shadow-palette /* コマンドパレット */
```

#### モーション変数（新設）

```css
/* Duration */
--ag-duration-instant  : 80ms   /* ドラッグフィードバック */
--ag-duration-fast     : 120ms  /* ホバー・フォーカス */
--ag-duration-normal   : 200ms  /* パネル出現・ダイアログ */
--ag-duration-slow     : 300ms  /* テーマ切替 */

/* Easing */
--ag-ease-in-out : cubic-bezier(0.25, 0.46, 0.45, 0.94)  /* 中割（動き始め・終わりが緩やか） */
--ag-ease-out    : cubic-bezier(0.0, 0, 0.2, 1)           /* 出現 */
--ag-ease-in     : cubic-bezier(0.4, 0, 1, 1)             /* 消去 */
--ag-ease-bounce : cubic-bezier(0.34, 1.56, 0.64, 1)      /* ドロップ成功 */
```

#### 背景レイヤ変数（新設）

```css
/* Background layer 合成 */
--ag-bg-base     : linear-gradient(180deg, surface-0 0%, surface-page 100%)
--ag-bg-grid     : radial-gradient(circle, rgba(128,128,128,0.22) 1.5px, transparent 1.5px)
--ag-bg-noise    : url("data:image/svg+xml,...")  /* SVG noise filter */
--ag-bg-contour  : url("...")  /* 等高線オーバーレイ（オプション） */

/* Blur / Frosted Glass */
--ag-blur-sm     : blur(4px)
--ag-blur-md     : blur(12px)
--ag-blur-lg     : blur(24px)
```

---

## 3. モーション設計言語

### 3-1. 標準トランジションクラス（Tailwind 拡張候補）

将来的に Tailwind の `theme.extend.transitionDuration` / `transitionTimingFunction` に登録。
実装バッチまでは Tailwind 標準 (`duration-150`, `ease-out` 等) で代替する。

### 3-2. コンポーネント別モーション仕様

| コンポーネント     | 操作  | アニメーション                             |
| ------------------ | ----- | ------------------------------------------ |
| Button             | hover | bg opacity +1 段階、duration-fast          |
| Button             | click | scale 0.97、duration-instant               |
| Card / List item   | hover | bg opacity +1 段階、left border 2px accent |
| Dialog             | 出現  | scale 0.96→1 + fade、duration-normal       |
| Dialog             | 消去  | scale 1→0.96 + fade、duration-fast         |
| Toast              | 出現  | translateY -100%→0 + fade                  |
| Toast              | 消去  | translateX 0→100% + fade                   |
| Palette            | 出現  | scale 0.98→1 + fade、duration-normal       |
| D&D ドロップゾーン | over  | border-accent + glow、duration-fast        |
| D&D 成功           | drop  | bounce scale 1.02→1、duration-fast         |
| Tab 切替           | click | content fade 100ms                         |

### 3-3. Reduced Motion 対応

```css
@media (prefers-reduced-motion: reduce) {
  --ag-duration-instant : 0ms;
  --ag-duration-fast    : 0ms;
  --ag-duration-normal  : 0ms;
  --ag-duration-slow    : 0ms;
}
```

Tailwind: `motion-reduce:transition-none` をすべてのアニメーション要素に付与。

---

## 4. 背景レイヤ設計

### 4-1. レイヤ合成モデル

```
Layer 5 (最前面): UI コンテンツ
Layer 4: Frosted Glass ブラー（backdrop-filter）
Layer 3: テクスチャ / ノイズオーバーレイ（SVG filter）
Layer 2: 等高線コンタ（option: SVG / CSS）
Layer 1: 壁紙 / グラデーション背景
Layer 0 (最背面): ソリッド背景色（フォールバック）
```

### 4-2. 実装優先順位

1. **Phase A（設計バッチ）**: Layer 0 + Layer 1 (グラデーション) を CSS 変数化
2. **Phase B（背景基盤バッチ）**: **透過背景 + Frosted Glass が中核**
   - Layer 4: `backdrop-filter: blur(12px) saturate(180%)` を `.frosted-panel` クラスとして提供
   - Layer 3: SVG `feTurbulence` ノイズテクスチャ（`--ag-bg-noise`）
   - `--ag-surface-*` の背景色を Frosted Glass と組み合わせて使えるよう透過度を調整
3. **Phase C（テーマバッチ）**: Layer 2 (コンタ) + 壁紙設定 UI

### 4-3. 壁紙設定の要件（将来実装）

- 設定 UI から JPEG/PNG を選択
- Tauri API でファイルを読み込み、CSS custom property に `url(...)` を設定
- Tauri のウィンドウ透過 (`transparent: true`) は重大な変更なので慎重に
- まずは CSS 背景のみ（ウィンドウ自体は不透明のまま）で実現可能か検討

---

## 5. サウンド設計言語

### 5-1. 採用イベント対応表

| イベント             | 音の性質            | 優先度              |
| -------------------- | ------------------- | ------------------- |
| sfx.click            | 短いクリック音      | 高（デフォルト ON） |
| アイテム起動成功     | 短い上昇音（100ms） | 中                  |
| ウィジェット削除確定 | 短い下降音（100ms） | 低                  |
| インポート完了       | 明るい通知音        | 低                  |
| エラー発生           | 短い警告音          | 低                  |

`sfx.click` 適用対象: プライマリボタン確定 / コマンドパレット実行 / パレット結果行選択

### 5-2. 技術仕様

- Web Audio API を使用（外部ファイル依存なし）
- 音量は 0.0〜1.0 の設定値で制御（OS ボリュームとの乗算）
- デフォルト: OFF（設定画面でトグル + ボリュームスライダー）
- すべての音は 200ms 以下の短音のみ採用

---

## 6. テーマ切替アーキテクチャ

### 6-1. 現行

- `light` / `dark` の 2 モード（CSS クラス `.dark` のトグル）
- カスタムテーマは CSS variables の JSON を DB に保存（`theme_repository`）

### 6-2. 拡張方針

```
BuiltinTheme (CSS クラス)
  ├── dark (現行)
  ├── light (現行)
  ├── endfield (新: Arknights Endfield 調)
  └── frosted (新: Ubuntu 透過調)

CustomTheme (DB 保存)
  └── ユーザが色を編集したテーマ（現行機能）
```

### 6-3. プリセット実装方針

- 各プリセットは CSS ファイルまたは `:root.theme-endfield { ... }` クラスで管理
- `themeStore.activePreset` でプリセット名を管理
- プリセット切替時: `:root` に `data-theme="endfield"` 属性を付与 → CSS セレクタが切替
- カスタムテーマは `data-theme` を無視して CSS variables を直接上書き

---

## 7. 実装バッチへの入力

```
設計バッチ:
  - --ag-shadow-{sm,md,dialog,palette} 追加
  - --ag-duration-{instant,fast,normal,slow} 追加
  - --ag-ease-{in-out,out,in,bounce} 追加
  - Button / Card のマイクロインタラクション標準化

背景レンダリング基盤バッチ:
  - --ag-bg-noise (SVG filter) 実装
  - backdrop-filter: blur を Frosted Glass クラスとして提供

テーマプリセットバッチ:
  - data-theme="endfield" CSS クラス追加
  - data-theme="frosted" CSS クラス追加
  - 設定画面にプリセット選択 UI 追加
```
