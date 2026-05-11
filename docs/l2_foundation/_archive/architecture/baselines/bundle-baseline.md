# バンドルサイズ ベースライン

計測日: 2026-04-25 / batch-63 (PH-270, PH-271)

## フロントエンドバンドル（PH-270）

ツール: rollup-plugin-visualizer 7.0.1 + pnpm build (SvelteKit static adapter)

### サイズ概要

| 区分     | サイズ (raw) | サイズ (gzip) |
| -------- | ------------ | ------------- |
| JS 合計  | 428KB        | 134KB         |
| CSS 合計 | 100KB        | 16KB          |
| **合計** | **556KB**    | **150KB**     |

### JS チャンク top 5 (raw)

| ファイル                       | サイズ  | gzip   |
| ------------------------------ | ------- | ------ |
| `nodes/2.CaTlkho-.js` (メイン) | 302.9KB | 83.7KB |
| `chunks/BSyGwTi_.js`           | 36.2KB  | —      |
| `chunks/CDk8TfDx.js`           | 26.1KB  | —      |
| `chunks/CC-iDZOB.js`           | 23.8KB  | —      |
| `nodes/3.DcivTwLl.js`          | 18.5KB  | —      |

### runtime 依存

- `@tauri-apps/plugin-fs` のみ（他はすべて devDependency）
- フロントバンドルは Svelte/SvelteKit コンパイル済みコードのみ構成

### vision.md 制約との比較

| 制約                    | 目標  | 現状   | 判定 |
| ----------------------- | ----- | ------ | ---- |
| フロントバンドル (gzip) | —     | 150KB  | ✅   |
| 単体 exe ≤ 20MB (後述)  | 20MB  | 17MB   | ✅   |
| idle メモリ ≤ 100MB     | 100MB | 未計測 | —    |
| 起動 P95 ≤ 2 秒         | 2s    | 未計測 | —    |

---

## Rust バイナリ（PH-271）

ツール: cargo-bloat 0.11.x / release profile (optimized + debuginfo)

### バイナリサイズ

| バイナリ            | ファイルサイズ | .text セクション |
| ------------------- | -------------- | ---------------- |
| arcagate.exe (main) | **16.4MB**     | 11.6MB           |
| arcagate_cli.exe    | 3.1MB          | 2.5MB            |

> 注: `optimized + debuginfo` ビルド。本番 strip 後はさらに小さくなる見込み。

### クレート別寄与 top 10（arcagate.exe .text）

| クレート          | .text   | .text % |
| ----------------- | ------- | ------- |
| tauri             | 2.2MB   | 18.7%   |
| std               | 2.1MB   | 17.9%   |
| arcagate_lib      | 1.6MB   | 13.8%   |
| [unknown]         | 1.2MB   | 10.5%   |
| tokio             | 933.6KB | 7.8%    |
| serde_json        | 342.8KB | 2.9%    |
| regex_automata    | 326.7KB | 2.8%    |
| regex_syntax      | 254.0KB | 2.2%    |
| tauri_runtime_wry | 212.7KB | 1.8%    |
| aho_corasick      | 186.4KB | 1.6%    |

### 所見

- tauri + std + tokio が約 5.2MB (44.4%) を占める — Tauri フレームワークのコスト
- regex 関連 (regex_automata + regex_syntax + aho_corasick = 767KB) が比較的大きい
  → 用途確認: URL マッチング / MIME type 判定（infer, urlpattern 経由）と推定
- arcagate_lib 自体は 1.6MB — アプリロジックとして妥当
- vision.md の 20MB 制約に対し **16.4MB でクリア**（symbolstrip 後はさらに削減可能）

### 削減候補（優先度低）

| 候補               | 効果見積 | リスク                     |
| ------------------ | -------- | -------------------------- |
| regex 関連を削減   | ~500KB   | 中 (Tauri/plugin 間接依存) |
| symbol strip       | ~2-4MB   | 低                         |
| tokio 最小 feature | ~100KB   | 低                         |

現状の 16.4MB は vision 目標内のため、即対応不要。

---

## 次のベースライン更新タイミング

- 新規クレート追加 PR で ±500KB を超えたら再計測
- リリースビルド strip 後の実サイズを M2 リリース前に計測
