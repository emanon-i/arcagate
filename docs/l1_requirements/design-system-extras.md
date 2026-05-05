# Design System Extras (§4-7)

[design-system.md](./design-system.md) §1-3 の続編。

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

### 6-2. 拡張方針（実装済み 2026-04-24）

```
BaseTheme (CSS クラス)
  ├── dark  → .dark クラスをトグル
  └── light → .dark クラスを除去

BuiltinCustomTheme (DB 保存 + CSS 構造オーバーライド)
  ├── Endfield      (dark ベース: Arknights Endfield 調)
  ├── Ubuntu Frosted (dark ベース: Ubuntu Yaru/Frost 調)
  └── Liquid Glass  (dark ベース: Apple Liquid Glass 調 / backdrop-filter)

UserCustomTheme (DB 保存)
  └── ユーザが CSS 変数を編集したテーマ（テーマエディタ: batch-49+ 実装予定）
```

### 6-3. プリセット実装方針（実装済み）

- 組み込みカスタムテーマは `src-tauri/migrations/01N_*.sql` で `INSERT OR IGNORE` として DB に seed
- `applyTheme()` がカスタムテーマの `css_vars` JSON を `el.style.setProperty()` で `:root` に展開
- 同時に `el.dataset.theme = activeMode` を設定 → `arcagate-theme.css` の `[data-theme="..."]` セレクタが構造 CSS を適用
- `backdrop-filter` など CSS 変数だけでは設定できないプロパティは `[data-theme]` セレクタ側で定義
- `--ag-backdrop: none` を `:root` のデフォルト値として設定（既存テーマへの影響ゼロ）

### 6-4. テーマエディタ（batch-49〜53 実装済み）

- **MVP (batch-49)**: Settings > 外観 に ThemeEditor をインライン展開。`css_vars` を color picker / text input で調整。変更は即時 CSS var に反映。
- **polish (batch-50)**: isDirty バッジ・"✓ 保存しました" フィードバック・閉じ時 CSS vars リセット（`$effect` cleanup）。
- **テーマ名インライン編集 (batch-51)**: テーマ名クリックで `<input>` に切替→Enter/blur 保存。
- **ビルトイン「コピーして編集」(batch-52)**: 組み込みテーマカードに直接「コピーして編集」ボタン追加。
- **全変数カバレッジ拡張 (batch-53)**: 51 変数すべてを ThemeEditor に表示（css_vars にない変数は `getComputedStyle` でデフォルト値を補完）。カテゴリ: bg/surface/border/accent/text/error/warm/success/shadow/radius/backdrop/duration/ease。

### 6-5. ファイル入出力（batch-53 実装済み）

- **エクスポート**: クリップボードコピー（Copy ボタン）+ JSON ファイルダウンロード（DL ボタン）
- **インポート**: JSON テキスト貼り付け + ファイル選択（`<input type="file" accept=".json">`）→ FileReader で読み込み

### 6-6. Layer 3 外部テーマスキャン（将来計画）

- `%APPDATA%/arcagate/themes/<name>/manifest.json + theme.css` をスキャン
- manifest: `name / author / version / compatible_with`
- CSS: `--ag-*` 変数上書き形式
- Settings の外観セクションから選択可能に

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
