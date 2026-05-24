# Window Drag Region (オーバーレイ window 操作)

> cross-cutting / フルスクリーンオーバーレイ表示中も window をドラッグ移動できる契約。

## 目的

`fixed inset-0` のフルスクリーンオーバーレイ (SetupWizard / OnboardingTour / HelpPanel /
Settings ダイアログ / Tauri-style modal Dialog 等) は、 TitleBar の `data-tauri-drag-region`
を完全に覆い隠す。 この状態でも user が window を掴んで移動できるよう、 各オーバーレイは
**自身の内部に細い `data-tauri-drag-region` 帯** を露出させる契約。

PH-CF-1000 B1 で導入: 初回ウィザード (SetupWizard) 表示中に window を移動できない user
報告が起点。 同型の `fixed inset-0` オーバーレイ全てで同じ問題が起きていた。

## やること (必要処理)

各 active なフルスクリーンオーバーレイは:

- オーバーレイ最上部に **高さ約 32px (Tailwind `h-8`)** の細い帯を配置する
- 帯は `position: absolute / fixed; top: 0; left: 0; right: 0` で window 上端に貼り付ける
- 帯に `data-tauri-drag-region` 属性を付与する
- 帯の `pointer-events` は **auto** (default、 drag を受けるため必須)
- z-index は overlay 内の他要素より高くしすぎない (= dialog content のボタン等を覆わない)
- `aria-hidden="true"` で screen reader から隠す (装飾要素のため)

## やらないこと (禁止 / scope 外)

- インタラクティブ要素 (`<button>` / `<a>` / `<input>` 等) に `data-tauri-drag-region` を付与しない (= drag が click 操作を吸ってしまう)
- 全画面に drag region を貼らない (= dialog 内のフォーム入力 / ボタン操作を吸ってしまう)
- TitleBar 自体の z-index を変更しない (= 既存 layout / Tauri 標準に従う)
- Palette 専用 webview window (TitleBar 無し) には付与しない (対象外)

## 機能契約

### オーバーレイ window 操作契約 (PH-CF-1000 B1)

`fixed inset-0` のフルスクリーンオーバーレイ (SetupWizard / OnboardingTour / HelpPanel /
Settings / BaseDialog 等) は、 表示中も window をドラッグ移動できるよう
**`data-tauri-drag-region` 付きのヘッダー帯** を持つ。 drag region は **ヘッダー帯 (h-8 程度)
に限定** し、 ボタン等のインタラクティブ要素には付けない。 別 webview window 上の overlay
(Palette 等、 TitleBar を持たない window で動くもの) は対象外。

### 機械検出

- `scripts/audit-overlay-drag-region.sh` (`audit:all` + lefthook):
  - 全 `src/**/*.svelte` で `fixed inset-0` を含むファイルは `data-tauri-drag-region` を必ず含む (`pointer-events-none` 付き passive overlay と allowlist marker は除外)
  - `<button>` / `<a>` に `data-tauri-drag-region` が付いていない (0 violations)
- e2e: `tests/e2e/ph-cf-1000-overlay-drag.spec.ts` で SetupWizard / HelpPanel / Settings 各表示時に `[data-testid="overlay-drag-region"]` 要素が visible + drag region 属性を持つことを assert

## 既知の判断

- `data-tauri-drag-region` は Tauri 公式の drag region 標準 (= bit-set ベースの custom CSS property `-webkit-app-region` を使わない、 Windows / macOS / Linux の WebView2 / WKWebView / WebKitGTK 全てで動く)
- 帯の高さ `h-8` (32px) は TitleBar の `h-10` (40px) よりわずかに細く、 overlay content と視覚的に競合しない値。 user が偶然 click した場合の dismiss 動作 (= bits-ui DismissibleLayer 等) を妨げない 32px はあらかじめ「window 上端」 に貼られるため overlay 内 dialog header と重なる事はほぼ無い
- BaseDialog (bits-ui Dialog) では drag region を Portal の外側に配置し、 DismissibleLayer の外側クリック判定を回避 (drag が dialog dismiss に化けない)。 SetupWizard / OnboardingTour / HelpPanel / Settings 直 overlay では `pointer-events-auto absolute top-0` で overlay 内 layer に置く
- D&D 視覚 fallback overlay (`+page.svelte` の `pointer-events-none fixed inset-0 z-40`) は受動 (click も drag も受けない、 下層 TitleBar に passthrough) のため drag region 不要 (audit script の skip 条件)
