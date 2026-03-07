# Lessons

プロジェクト内で判明した落とし穴・パターン・ベストプラクティスを記録する。

---

## 技術的負債（F-3b コードレビューで検出）

### `category_repository::find_all_with_counts()` の相関サブクエリ

- 現状: カテゴリごとに `(SELECT COUNT(*) ...)` の相関サブクエリで件数取得（O(N)）
- 改善案: `LEFT JOIN item_categories ... GROUP BY c.id` に書き換えれば O(1)
- 判断: カテゴリ50未満では問題なし。100+ で要対応

### `LibraryMainArea.svelte` の $effect race condition

- 現状: `$effect` で `activeCategory` / `searchQuery` 変更時に `loadItemsByCategory()` を呼ぶ
- リスク: 高速切替時に stale response が後着して上書きする可能性
- 判断: IPC <10ms のため実用上は顕在化しにくい。AbortController or request ID で将来対策可能

---

## コードレビュー改善パターン（PH-003 コードレビュー）

### `pub(crate)` で helper を crate 内共有する

- Repository 内の private helper を別 Repository から再利用したい場合は `pub(crate)` に昇格させる
- `workspace_repository.rs` の `row_to_item` 重複は `item_repository::row_to_item` を `pub(crate)` にして解消
- テストモジュールで `use super::*` しても `ItemType` 等が不足する場合は test 側の `use` に追記が必要

### Clippy: `manual_clamp` 警告

- `limit.max(1).min(500)` は clippy `-D warnings` で `manual_clamp` エラーになる
- → `limit.clamp(1, 500)` を使うこと

### Delete の行数チェックで NotFound を返す

- `conn.execute("DELETE ...")` は影響行数 `usize` を返す。`== 0` なら `AppError::NotFound` を返すべき
- 存在しない ID を渡しても `Ok(())` になるのはバグの温床

### watcher エラーは `let _` で握り潰さない

- `let _ = w.watch(...)` ではなく `if let Err(e) = w.watch(...) { log::warn!(...) }` でログに残す

### Svelte state: `createItem` 後の全件再取得は不要

- IPC が `Promise<Item>` を返す場合は `items = [...items, created]` でローカル追加
- `createCategory` / `createTag` が正しいパターン

### 共有定数は types ファイルに置く

- `widgetLabels` を複数コンポーネントで重複定義しない
- `src/lib/types/workspace.ts` に `WIDGET_LABELS: Record<WidgetType, string>` を export して各コンポーネントで import する

---

## Playwright E2E（Tauri v2 + WebView2 CDP）

### セットアップ

- `tauri = { features = ["devtools"] }` + `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9515` で CDP 接続
- `lib.rs` に `std::env::var("ARCAGATE_DB_PATH")` を追加して DB パス上書き対応（テスト隔離用）
- `tests/` を `biome.json` の `files.includes` に追加しないと lint されない
- `@types/node` を devDependencies に追加（Node.js 型定義がないと `process` / `Buffer` が解決できない）
- fixture の `base.extend` の空分割代入は biome の `noEmptyPattern` 違反 → `_fixtures` に変更
- `page.evaluate(...)` の戻り値は `unknown` → `as unknown as T` のキャストが必要

### デバッグパターン

| パターン                                   | 症状                                                                             | 対処                                                                         |
| ------------------------------------------ | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **waitForURL 必須**                        | CDP 疎通後もページが `about:blank` のことがある                                  | `page.waitForURL(/^http:\/\/localhost:5173/)` を必ず挟む                     |
| **IPC → store バイパス**                   | `page.evaluate` 経由の IPC は Svelte store に通知されない                        | UI アサーション前に `page.reload()` + `waitForLoadState('domcontentloaded')` |
| **キーイベントはフォーカスが必要**         | `page.keyboard.press('Escape')` が届かない                                       | `await input.focus()` を先に呼ぶ                                             |
| **`getByText` は input.value にもマッチ**  | `fill()` 後に strict mode 違反になる                                             | コンテナを `page.locator('.max-h-80')` 等で限定する                          |
| **`onMount` は active タブで再発火しない** | タブ切り替えなしでは mount が走らない                                            | `page.reload()` → タブクリックの順で再発火させる                             |
| **`role="dialog"` がないダイアログ**       | `getByRole('dialog')` が失敗する                                                 | ダイアログ固有のボタンや要素で代替                                           |
| **テキスト部分一致の誤マッチ**             | `getByRole('button', { name: 'ワークスペース' })` がワークスペース名タブにも一致 | `{ exact: true }` を追加する                                                 |

---

## Tauri v2

- `global_shortcut().register()` にハンドラは渡せない → `Builder::new().with_handler(...)` で登録する
- `@tauri-apps/api` はデフォルトで package.json に含まれない → `pnpm add -D @tauri-apps/api` で追加
- Playwright のブラウザコンテキストでは Tauri IPC が使えない（`invoke` が TypeError）。IPC 検証は Tauri ネイティブウィンドウで行う
- `@tauri-apps/api/event` の `listen()` は `addInitScript` でモックできない（`transformCallback` を内部で呼ぶ）。ブラウザ mock は不可と割り切り、「コードレビュー + vitest」で代替検証する
- **capabilities 権限不足**: `core:default` にはウィンドウ操作権限が含まれない。カスタムタイトルバーでは `core:window:allow-minimize`, `core:window:allow-toggle-maximize`, `core:window:allow-close`, `core:window:allow-start-dragging`, `core:window:allow-is-maximized` を明示追加する
- **`getCurrentWindow()` の SSR 問題**: モジュールスコープで呼ぶと SSR 時にクラッシュする。`onMount` 内で動的 import して呼ぶこと: `const { getCurrentWindow } = await import('@tauri-apps/api/window')`
- **`plugin:window|set_size` の値シリアライズ**: Rust 側は tagged enum `{ "Logical": { "width": w, "height": h } }` を期待する。JS API の `{ type: "Logical", data: { ... } }` 形式は使えない
- **`page.evaluate` 内で bare module specifier は不可**: `@tauri-apps/api/window` 等の動的 import はブラウザコンテキストで解決できない。`__TAURI_INTERNALS__.invoke('plugin:window|set_size', ...)` を直接呼ぶ

---

## Rust / Cargo

- **`cargo test` は `[[bin]]` バイナリを更新しないケースがある**: smoke-test が古いバイナリを参照すると `DatabaseTooFarAhead` などのエラーになる。`cargo build --bin <name>` を明示実行してから verify する
- **複数バイナリ構成**: `[package]` に `default-run = "arcagate"` が必須（tauri build が失敗する）
- **バイナリからライブラリモジュールを参照**: `mod` のままだと参照不可 → `pub mod` に変更する
- `clippy::should_implement_trait`: `from_str` メソッドに対して発生。`#[allow(clippy::should_implement_trait)]` で抑制
- `notify::Watcher` や `tauri::Manager` など trait は明示 import が必要（メソッドが見えない）
- `State<DbState>` の lifetime 問題: State から借用しながらループは不可。先に Vec へ収集してから使う
- エージェント生成後は `cargo fmt` を必ず実行すること

---

## SQLite

- **DEFAULT バグ**: INSERT SQL に `created_at` / `updated_at` を列挙すると、スキーマの `DEFAULT (strftime(...))` が無効になりエポック値（`"created_at": "1970-01-01T00:00:00Z"`）が入る。列リストから除外して DB DEFAULT に委ねる
- **N+1**: insert 後に `find_all()` で全件取得して id 検索するのは N+1。`find_by_id()` を追加して直接1件取得に変える

---

## shadcn-svelte CLI の `import type` バグ

- **症状**: shadcn-svelte CLI が生成する `.svelte` ファイルで `import type { X } from "bits-ui"` としているが、テンプレート内で `<X.Root>` 等のランタイム値として使用。`import type` はコンパイル時に除去されるため svelte-check エラー + 実行時クラッシュ
- **影響範囲**: `src/lib/components/ui/` の DropdownMenu (15), Tooltip (5), ScrollArea (2), Separator (1) = 計23ファイル。加えてローカル `.svelte` の type import（DropdownMenuPortal, TooltipPortal）も同様
- **修正方法**: `import type { X as XPrimitive } from "bits-ui"` → `import { X as XPrimitive } from "bits-ui"` に一括置換。`import type { ComponentProps } from "svelte"` 等の真の型インポートは変更しない
- **再発防止**: `npx shadcn-svelte@latest add` でコンポーネント追加時は、生成後に `npx svelte-check` で型エラーがないか確認する。同パターンが出たら同じ修正を適用
- **参照**: PH-003-G (`docs/l3_phases/PH-20260226-003_power-user-expansion/PH-003-G_shadcn-import-fix.md`)

---

## Biome / フロントエンド

- `biome check --write` でインデント・クォートの差異を自動修正できる
- `isFinite` → `Number.isFinite` は unsafe fix: `biome check --write --unsafe`
- import 順序エラーも `pnpm biome check --write` で一括修正できる
- エージェント生成後は必ず `pnpm biome check --write` を実行すること

---

## MCP サーバー（stdio JSON-RPC 2.0）

- **stdout 専用原則**: `stdout` は JSON-RPC メッセージ専用。`println!` を1行でも混入するとクライアントが壊れる。ログは `eprintln!` のみ
- **エラーコード**: 引数不足は `-32602`（Invalid params）、権限・業務エラーは `-32000` で統一
- **`notifications/initialized`**: レスポンスを返さない（`None` を返す設計）
- **Claude Code への登録**: `~/.claude.json` の `mcpServers` に追加後、Claude Code の**再起動が必要**（起動時のみ読み込み）。`/mcp` コマンドで接続確認
- **パーミッション境界テスト**: 実プロセス起動を伴うテスト（`launch` など）は「Permission denied でないこと」を確認する設計にする。境界テストと業務ロジックテストは分ける

---

## smoke-test（verify:smoke）

- `bash scripts/smoke-test.sh` で呼び出す（Windows 上でも `bash` が PATH にあれば動く）
- `cargo run` ではなく `target/debug/arcagate_cli(.exe)` を直接参照する（再コンパイル回避 + Windows exe ロック問題回避）
- `call_tool` の戻り値は `[{"type": "text", "text": "..."}]` 形式。内部 JSON はエスケープ済み → grep は `'value'` のように quotes なしで行う
- UUID 抽出: `grep -o '[0-9a-f]\{8\}-[0-9a-f]\{4\}-[0-9a-f]\{4\}-[0-9a-f]\{4\}-[0-9a-f]\{12\}'`

---

## GitHub Actions CI

- `pnpm/action-setup@v4` は `package.json` に `"packageManager": "pnpm@x.x.x"` がないと即失敗する
- Windows CI で `core.autocrlf=true` が CRLF 変換 → Biome format check 失敗。`.gitattributes` に `* text=auto eol=lf` を追加して解決
- 新規プロジェクトで CI を追加するときは上記2点をセットで対応すること

---

## tauri-plugin-log

- ログ保存先: `%LOCALAPPDATA%\{bundle-identifier}\logs\`（`%APPDATA%` ではない）
- `file_name` パラメータを指定してもファイル名はプロダクト名（例: `Arcagate.log`）になる
- デフォルトの `max_file_size` は 40KB と極小。本番では `5 * 1024 * 1024`（5MB）などを明示する
- stdout は debug ビルドのみ: `if cfg!(debug_assertions)` で条件分岐してターゲットに追加する

---

## デスクトップアプリ UX（実機フィードバック PH-003-F5）

- **情報密度**: ラベル・サブタイトル・バッジ・説明文が多すぎると逆に使いにくい。「ユーザーの操作を助けるか？なくても困らないか？」を自問する
- **操作ステップ**: ランチャーアプリは2クリック以内で起動が原則。ダブルクリック起動を標準装備する
- **パネル/モーダル**: 閉じるボタン + Esc 対応を必ず付ける
- **無効状態の視覚化**: `is_enabled=false` は `opacity-40 grayscale` で明示する
- **flex/grid の h-full 伝播**: 親が `overflow-hidden` + `min-h-0` でないと子に高さが伝わらない。`overflow-auto` は各パネル個別に付ける
- **CSS Grid の `grid-template-rows` 未指定**: デフォルトは `auto`（コンテンツ高さに縮む）。フルハイトが必要なら `grid-rows-[1fr]` を明示する。グリッド子要素にも `min-h-0` が必要（デフォルトの `min-height: auto` が overflow を阻害する）
- **デスクトップ標準**: `user-select: none`（入力欄は除外）、`autocomplete="off"`、カスタムスクロールバーをデフォルトにする
- **prompt() 廃止**: デスクトップアプリで `prompt()` は UX 品質を下げる。インライン入力に置き換える

---

## 開発ワークフロー全般

- **コンポーネント組み込み忘れ**: 作っても親に組み込まないと動かない。サブエージェント並列生成後は「繋ぎ忘れ」が起きやすい → 統合確認を必須ステップにする
- **動作確認の基準**: アプリを実際に起動して操作するまで完了とみなさない。副作用を持つコマンド（`run` など）も必ず実行して確認する
- **検証アーティファクト**: スクリーンショットは `tmp/screenshots/`（`.gitignore` 済み）に保存
- **`/simplify` の適用スコープ**: git diff 対象だけでなく全実装ファイルへの適用も有効。発見パターン: デッドコード・N+1・不要 Vec・重複 try-catch・タイムスタンプバグ

---

## biome 2.x の override で `linter.enabled: false` が効かない

biome 2.4.4 で `overrides[].linter.enabled: false` を設定しても lint が実行される（formatter/assist の `enabled: false` は正常動作）。回避策: `linter.rules.recommended: false` を併用する。

```json
{
  "includes": ["src/lib/components/ui/**"],
  "linter": {
    "enabled": false,
    "rules": { "recommended": false }
  },
  "formatter": { "enabled": false },
  "assist": { "enabled": false }
}
```
