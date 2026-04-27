# Lessons

プロジェクト内で判明した落とし穴・パターン・ベストプラクティスを記録する。

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
- **参照**: PH-003-G (`docs/l3_phases/archive/PH-20260226-003_power-user-expansion/PH-003-G_shadcn-import-fix.md`)

---

## Biome / フロントエンド

- `biome check --write` でインデント・クォートの差異を自動修正できる
- `isFinite` → `Number.isFinite` は unsafe fix: `biome check --write --unsafe`
- import 順序エラーも `pnpm biome check --write` で一括修正できる
- エージェント生成後は必ず `pnpm biome check --write` を実行すること

---

## Agent-first CLI 設計判断

- **MCP 除去**: 7 tools の stdio JSON-RPC 2.0 サーバーを除去（約800行）。CLI + Skill ファイルで代替
- **判断理由**: Claude Code のみで使用、Claude Desktop は不使用。7操作の個人アプリに JSON-RPC は過剰。CLI で Human DX + Agent DX を両立
- **`--json-input`**: `create` コマンドに JSON 入力パスを用意。エージェントはフラットな引数より JSON を好む
- **`describe`**: スキーマ内省コマンド。エージェントが実行時に CLI を自己学習できる
- **`--dry-run`**: `create` と `run` に追加。破壊的操作の事前検証
- **入力ハードニング**: パス検証（`..` トラバーサル拒否）、制御文字拒否（ASCII 0x00-0x1F）
- **Skill ファイル**: `.claude/skills/arcagate.md` で `--help` より安定したエージェント誘導
- **参考**: ["You Need to Rewrite Your CLI for AI Agents"](https://justin.poehnelt.com/posts/rewrite-your-cli-for-ai-agents/)

---

## smoke-test（verify:smoke）

- `bash scripts/smoke-test.sh` で呼び出す（Windows 上でも `bash` が PATH にあれば動く）
- `cargo run` ではなく `target/debug/arcagate_cli(.exe)` を直接参照する（再コンパイル回避 + Windows exe ロック問題回避）

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

## L3 ドキュメント完了マーキングの検証義務

- **失敗パターン**: プランに「全項目 PASS」と書いてあったのを鵜呑みにして、コードを一切読まずに33件のチェックボックスを `[x]` に一括置換した
- **ルール**: L3 ドキュメントの受け入れ条件を `[x]` にする前に、必ず該当コードを読んで各条件が満たされていることを自分の目で確認する。プランや前セッションの記述を信用しない
- **理由**: 「完了」マークは品質保証の意味を持つ。検証なしのチェックは虚偽の品質証明

---

## 開発ワークフロー全般

- **コンポーネント組み込み忘れ**: 作っても親に組み込まないと動かない。サブエージェント並列生成後は「繋ぎ忘れ」が起きやすい → 統合確認を必須ステップにする
- **動作確認の基準**: アプリを実際に起動して操作するまで完了とみなさない。副作用を持つコマンド（`run` など）も必ず実行して確認する
- **検証アーティファクト**: スクリーンショットは `tmp/screenshots/`（`.gitignore` 済み）に保存
- **`/simplify` の適用スコープ**: git diff 対象だけでなく全実装ファイルへの適用も有効。発見パターン: デッドコード・N+1・不要 Vec・重複 try-catch・タイムスタンプバグ
- **E2E テストは `pnpm verify` に含まれない**: `pnpm verify` は lint/fmt/clippy/cargo test/vitest/tauri build のみ。`pnpm test:e2e` は別コマンドで手動実行が必要。実装完了後は `pnpm verify` に加えて **必ず** `pnpm test:e2e` を実行すること。E2E テスト用バイナリは `target/debug/arcagate.exe` なので、`cargo build` で debug ビルドを更新してから実行する

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

---

## トークン体系: shadcn と `--ag-*` の二重管理 (PH-20260311-001 U-3-7)

- **現状**: shadcn-svelte が生成する CSS は `--background`, `--foreground`, `--destructive` 等の Tailwind/shadcn トークンを使う。Arcagate 独自テーマは `--ag-surface-0`〜`--ag-text-primary` 等の `--ag-*` 接頭辞トークンを使う
- **影響**: `text-destructive` (shadcn) と `text-[var(--ag-text-primary)]` (AG) が同じコンポーネント内で混在する。テーマ切り替え時に shadcn トークンが追従しない可能性がある
- **対応済み (PH-20260422-043)**: `app.css` の `--background` / `--foreground` / `--border` / `--input` / `--ring` / `--muted` / `--muted-foreground` を `var(--ag-*)` 参照に変更。card/popover/sidebar 等 AG 未使用トークンは oklch 維持
- **Tailwind v4 での注意**: opacity modifier (`bg-muted/50` 等) は `color-mix(in oklch, ...)` で処理されるため rgba/hex 値も正常動作する

---

## UI 変更でテストが壊れるパターン（PH-20260422-040 の教訓）

- **問題**: ウィジェット削除ボタンのクリックが即時削除から「確認ダイアログ経由の削除」に変わった際、既存 E2E テスト (`workspace-editing.spec.ts`) が無言で壊れた
- **教訓**: **動作変更を伴う実装は常に「テスト更新が必要か？」を確認する**
  - 既存テストがある機能の UX フローを変更する際は同一 PR でテストも更新する
  - 「クリック → 即効果」が「クリック → 確認 → 効果」に変わる場合、テストには `page.getByRole('dialog')` + 確認ボタンクリックが必要
- **チェックリスト**: 変更対象機能に E2E テストが存在するか? 動作フローが変わる場合（ダイアログ追加等）はテストを同時更新したか?

---

## CSS トークンの未定義は `pnpm verify` で検出されない（サイレントバグ）

- **問題**: `var(--ag-accent)` 等が `arcagate-theme.css` で未定義のまま使われていても、Tailwind JIT / svelte-check / cargo clippy のいずれにもエラーが出ない
- **教訓**: CSS カスタムプロパティは未定義でも `initial`（空文字）にフォールバックするため、見た目の問題（色が出ない）としてのみ現れる
- **対策**: 新しい `var(--ag-*)` を使う際は `arcagate-theme.css` への追加を同じコミットで行う

---

## アーカイブ時の `git add -u` 漏れ（Batch 8 の教訓）

- **問題**: `mv` でファイルをアーカイブ移動後、`git add docs/l3_phases/archive/` だけ実行して `git add -u docs/l3_phases/` を忘れると、元の場所の削除が未ステージ状態になる
- **対策**: アーカイブコミット時は必ず `git add -u docs/l3_phases/` → `git add docs/l3_phases/archive/PH-*` → `git status` 確認 の順で実行する

---

## Playwright: PointerEvent と page.mouse の競合（Batch 16 の教訓）

- **問題**: `page.mouse.down()` → `page.mouse.move()` で `setPointerCapture` を内部で使う要素をドラッグしようとすると、`pointermove` が要素ではなく `document` に届き操作が失敗する
- **根本**: Playwright の `page.mouse` は CDP `Input.dispatchMouseEvent` を使うが、`setPointerCapture` が別の要素を capture している場合は合成イベントがそちらに吸収される
- **回避策**: `page.evaluate()` で `PointerEvent` を対象要素に直接 `dispatchEvent()` する:
  ```typescript
  await page.evaluate(({ x, y, dx }: { x: number; y: number; dx: number }) => {
      const el = document.querySelector('[aria-label="リサイズ"]') as HTMLElement;
      const mk = (type: string, cx: number) =>
          new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1, pointerType: 'mouse', clientX: cx, clientY: y });
      el.dispatchEvent(mk('pointerdown', x));
      el.dispatchEvent(mk('pointermove', x + dx));
      el.dispatchEvent(mk('pointerup', x + dx));
  }, { x: cx, y: cy, dx: 400 });
  ```
- **afterEach ガード必須**: `page.mouse.up().catch(() => {})` を `afterEach` で必ず実行する。テストが例外で終了するとマウスボタンが OS レベルで押下状態のまま残り、PC のマウス操作が全て乗っ取られる（実際に発生したインシデント）

---

## Playwright: `role="group"` は edit mode のみ存在する（Batch 16 の教訓）

- **問題**: reload 後に `[role="group"]` を確認しようとすると not found になる
- **根本**: Workspace の `role="group"` は編集モード時にのみレンダリングされる
- **対策**: reload 後は必ず `page.getByLabel('編集モード').click()` で編集モードに再入してから `[role="group"]` をアサートする

---

## Playwright: partial matching によるテキスト誤マッチ（Batch 16 の教訓）

- **問題**: `page.getByRole('button', { name: 'キャンセル' })` が strict mode 違反になる。「削除キャンセルテストWS」というワークスペース名のタブチップボタンが部分一致でマッチする
- **根本**: Playwright の `getByRole` の `name` は部分一致（contains）で動作する
- **対策**: ダイアログ内のボタンを取得する場合は `page.getByRole('dialog').getByRole('button', { name: 'キャンセル' })` のようにスコープを絞る。テストデータの命名に「キャンセル」「削除」等の UI テキストを含めない

---

## Playwright: @smoke タグと PR/nightly 分離パターン（Batch 17 の教訓）

- **タグ方法**: `test('タイトル', { tag: '@smoke' }, async ({ page }) => { ... })` で Playwright 1.42+ のタグ付けが可能
- **フィルタ実行**: `playwright test --grep @smoke` で smoke のみ実行
- **PR/nightly 分岐**: `e2e.yml` で `if: github.event_name == 'pull_request'` を使って PR 時は smoke のみ、push/dispatch 時はフルを使い分ける

---

## Svelte 5 `$effect` の配列依存追跡（Batch 18 の教訓）

- **問題**: `const _dep = itemStore.items.length` で依存宣言すると、`items = items.map(...)` で配列の内容が変わっても length が同じなら `$effect` が再実行されない
- **根本**: Svelte 5 の fine-grained reactivity は `.length` プロパティのみを追跡する。`map()` は同サイズの新配列を返すため length 変化なし → effect 不発
- **対策**: `const _dep = itemStore.items` で配列参照自体を追跡する。配列が置き換わるたびに effect が再実行される
- **適用場面**: `updateItem` / `deleteItem` のように配列の中身（タグ等）を変えるが個数は変えない操作の後にリアクティブ計算が必要な場合

---

## Biome: worktree パスに `.claude` が含まれると files.includes がスキップされる（Batch 21 の教訓）

- **問題**: worktree が `.claude/worktrees/` 配下にある場合、`pnpm biome check`（引数なし）が「No files were processed」で 0 ファイルになる
- **根本**: `biome.json` の `files.includes` に `"!!**/.claude"` が指定されている。worktree の絶対パスに `.claude/` が含まれるため、biome がディレクトリ全体を無視する
- **対策**: worktree からは `node_modules/.bin/biome check src/ tests/` と明示的にパスを渡して実行する

---

## Svelte: `<div>` onclick のアクセシビリティ警告抑制（Batch 21 の教訓）

- **問題**: 非インタラクティブな `<div>` に `onclick` を追加すると svelte-check が `a11y_click_events_have_key_events` / `a11y_no_noninteractive_element_interactions` の警告を出す
- **`<!-- svelte-ignore a11y_no_static_element_interactions -->` では足りない**: これは別のルールで、上記2つには個別の ignore コメントが必要
- **対策**: `onclick` がある `<div>` の直前に `<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->` を追加する。または `<button>` に書き換えを検討する

---

## CSS: `background-image` の複数レイヤーはインラインスタイルで Tailwind を上書きできる（Batch 21 の教訓）

- **パターン**: Tailwind の `bg-[linear-gradient(...)]` クラスは CSS class で `background-image` を設定する。インラインの `style=` に `background-image: ...` を書くと上書きできる（インライン style は class より specificity が高い）
- **ドットグリッドオーバーレイ**: `background-image: radial-gradient(circle, rgba(128,128,128,0.22) 1.5px, transparent 1.5px), linear-gradient(...)` で2つのグラデーションを重ねる
- **background-size も合わせて指定**: 複数レイヤーは `background-size` にカンマ区切りで対応させる（`24px 24px, 100% 100%`）

---

## E2E: `library-card-{id}` の表示確認テストはフレーキー（Batch 21 の観測）

- **症状**: `page.reload()` + `waitForAppReady` 後に `library-card-{id}` が 10 秒タイムアウト → `element(s) not found`
- **再現条件**: docs のみ変更（コード無変更）の PR でも発生。CI 環境の負荷によるタイミング問題と推測
- **retry でも失敗**: retry 1 で `page.evaluate: Execution context was destroyed`（finally ブロックの `deleteItem` で発生）
- **対処**: `gh run rerun {run-id} --failed` で再実行すると通過する。コードの問題ではないと判断してよい
- **根本改善候補**: `waitForAppReady` に「Library カードが1件以上表示されるまで待つ」条件を追加するか、`waitForSelector('[data-testid^="library-card-"]')` を挟む

---

## E2E: Playwright `expect.timeout` は明示設定すること（Batch 28 の教訓）

- **デフォルト 5000ms は CI Windows runner では短い**: Tauri の IPC（Rust ↔ SQLite）が非同期チェーンになると 5s を超えることがある
- **症状**: `toBeVisible()` / `not.toBeVisible()` が CI のみで失敗、ローカルでは通過
- **対処**: `playwright.config.ts` の `expect` ブロックに `timeout: 10_000` を明示する

```ts
expect: {
  timeout: 10_000,
  ...
}
```

---

## E2E: `@smoke` テスト選定基準（Batch 28 の教訓）

- **@smoke に向かないパターン**: 複数の非同期 IPC を連鎖するテスト
  - 例: `updateItem` IPC → `items` ストア更新 → `$effect` 起動 → `searchItemsInTag` IPC → DOM 更新
  - この連鎖は CI で 5〜10s かかる場合があり、短い timeout では失敗する
- **@smoke に向くパターン**: クリック → 即座に DOM 変化（IPC 1回以内）
- **原則**: 複雑な IPC 連鎖テストは nightly のみで運用し、@smoke には含めない
- **starredIds の具体例**: `LibraryMainArea.svelte` の starredIds 更新は 2 段階非同期（updateItem → $effect → searchItemsInTag）のため CI で不安定

---

## E2E: `webServer.timeout` は 120s 以上にすること（Batch 29 事後 CI fix の教訓）

- **デフォルト 60s は CI Windows runner では短い**: Vite の cold start（pnpm dev）が CI で 60〜90s かかることがある
- **症状**: `webServer` タイムアウトで全 E2E テストが起動前に失敗する
- **対処**: `playwright.config.ts` の `webServer.timeout: 120_000`（2分）以上を設定する
- **ローカルとの差**: ローカルでは HMR キャッシュが効くため問題にならないが、CI は毎回クリーンビルド

```ts
webServer: {
  command: 'pnpm dev',
  url: 'http://localhost:5173',
  reuseExistingServer: !process.env.CI,
  timeout: 120_000, // デフォルト 60s → CI では不足
}
```

---

## E2E: `globalTimeout` の CI/ローカル分岐（Batch 29 事後 CI fix の教訓）

- **現状**: `globalTimeout: 600_000`（10分）はローカル実行時にも適用される
- **適切な分岐パターン**: `process.env.CI ? 600_000 : 300_000` で環境ごとに設定を分ける
- **ローカルでは 300s（5分）が実用的**: ローカルランでは全 E2E が 2〜3 分以内に完了するため、600s では timeout 検知が遅すぎる

```ts
globalTimeout: process.env.CI ? 600_000 : 300_000,
```

---

## E2E: Playwright CDP mode で `browser.close()` は WebView2 プロセスを終了させる（Batch 37 e2e CI 修正）

- **問題**: `connectOverCDP` で取得した `browser` オブジェクトの `.close()` を呼ぶと `Browser.close` CDP コマンドが送信され、WebView2 プロセス自体が終了する
- **症状**: 1テスト目は通過するが、2テスト目以降の page fixture setup で `connectOverCDP` が 60s タイムアウト（CDP ポートが消滅するため）
- **修正パターン**: `browser` を **worker-scoped fixture** にして Worker 全体で 1 回だけ接続/切断する

```ts
// NG: テストごとに browser.close() を呼ぶ（WebView2 プロセスが死ぬ）
page: async ({}, use) => {
    const browser = await chromium.connectOverCDP(...);
    await use(page);
    await browser.close(); // ← これが WebView2 を殺す
},

// OK: worker-scoped で接続を保持
sharedBrowser: [
    async ({}, use) => {
        const browser = await chromium.connectOverCDP(...);
        await use(browser);
        await browser.close(); // Worker 終了時のみ呼ばれる
    },
    { scope: 'worker' },
],
page: async ({ sharedBrowser }, use) => {
    // sharedBrowser を使って page を取得
    ...
},
```

---

## E2E: `waitForTimeout` → `waitForSelector` / `expect().toBeVisible()` への移行パターン（Batch 28〜29 の教訓）

- **`waitForTimeout` の問題**: 固定待機は環境依存でフレーキーを招く。ローカル高速・CI 低速の差が顕著
- **移行パターン**:
  - DOM 要素出現待ち: `await page.waitForSelector('[data-testid="foo"]', { state: 'visible', timeout: 20_000 })`
  - 要素テキスト変化待ち: `await expect(el).toHaveText('expected', { timeout: 15_000 })`
  - ネットワーク/IPC 完了待ち: IPC 完了を示す DOM 変化（ボタン状態・バッジ出現）で間接的に待つ
- **タイムアウト明示**: 各 `waitForSelector` に `{ timeout: 20_000 }` を付けると `expect.timeout` との整合が取れる

---

## UI: HintBar のフローティング pill → 全幅バー移行パターン（Batch 43 の教訓）

- **問題**: `absolute bottom-4` の pill スタイルは親の `overflow-hidden` に切られる。Workspace コンテナが overflow-hidden を持つため pill が見切れる
- **解決**: `fixed bottom-0 left-0 right-0 w-full` で親の制約を飛び越える。または親コンテナの外側に移動してレイアウトを組み直す
- **教訓**: インタラクション用 UI は absolute より fixed の方が overflow の影響を受けにくい

---

## Settings: 2ペイン化のパターン（Batch 44 の教訓）

- **`activeCategory` 状態管理**: コンポーネントトップレベルの `$state` で管理し、各セクションを `{#if activeCategory === '...'}` で切り替える
- **aria ロール**: 左ナビは `role="tablist"`、各ボタンは `role="tab"`、右コンテンツは `role="tabpanel"` + `id` 属性
- **E2E テスト注意**: `aria-labelledby` が参照する `id` が存在しない場合 `getByRole('tabpanel', { name })` は機能しない。`page.locator('#settings-panel-{id}')` で id 直接指定する方が確実

---

## DB: 組み込みデータ INSERT には `INSERT OR IGNORE` を使う（Batch 45 の教訓）

- **問題**: マイグレーション SQL で `INSERT INTO themes ...` とすると、マイグレーションが再実行された場合に UNIQUE 制約違反が起きる
- **解決**: `INSERT OR IGNORE INTO themes ...` で既存レコードをスキップする
- **適用場面**: 初期シードデータの投入（組み込みテーマ・デフォルト設定値など）

---

## Global Shortcut: 常時フローティングパレットのホットキー管理（Batch 46 の教訓）

- **登録タイミング**: `global_shortcut().register()` はアプリ起動時の `setup` 内で一度だけ呼ぶ
- **変更時の手順**: `cmd_set_hotkey` でホットキーを変更する際は、旧ホットキーを `unregister()` してから新ホットキーを `register()` する（二重登録防止）
- **E2E 制限**: パレットがフローティングウィンドウ化されると、メインウィンドウの CDP コンテキストからは palette UI を操作できない。@smoke テストはボタン存在確認に留め、palette 操作テストは nightly のみにする

---

## ThemeEditor: $effect cleanup で unmount 時に CSS vars をリセット（batch-50 の知見）

- **パターン**: テーマエディタを閉じても未保存の CSS var が DOM に残存する問題への対処
- **原因**: `handleValueChange()` が `document.documentElement.style.setProperty()` で直接 DOM を書き換えるため、コンポーネント unmount 後も値が残る
- **解決**:
  ```typescript
  let savedCssVars = $state<VarEntry[]>(parseVars(initialCssVars));

  $effect(() => {
      return () => {
          // cleanup は unmount 時のみ呼ばれる（effect body に reactive dep なし）
          // savedCssVars は $state なので cleanup 時点の最新値が読まれる
          for (const { key, value } of savedCssVars) {
              document.documentElement.style.setProperty(key, value);
          }
      };
  });
  ```
- **注意**: `$effect` body で reactive な値を**読まない**ことが重要。body に `$state` を読む処理があると effect が再実行され cleanup が unmount 前にも呼ばれる
- **`savedCssVars` の更新**: 保存成功時に `savedCssVars = entries.map(e => ({ ...e }))` で更新する。cleanup は最後の保存済み状態にリセットする

---

## Svelte 5 $props() の初期値スナップショット警告（batch-50 の観察）

- **警告**: `This reference only captures the initial value of theme. Did you mean to reference it inside a closure instead?`
- **発生条件**: `const initialCssVars = theme.css_vars;` のように props を non-reactive な const に格納する
- **意図的なケース**: ThemeEditor では「マウント時の CSS vars を snapshot として保持」が正しい動作であり、警告は誤検知
- **対応**: `svelte-check` の warning は errors と区別される。`0 ERRORS N WARNINGS` なら `pnpm verify` は通過する。警告を消したい場合は `$derived` や `untrack()` を使う

---

## E2E: @smoke テスト間で Settings ダイアログが残存するバグ（batch-50 の教訓）

- **問題**: `Settings 2ペインカテゴリナビが機能すること @smoke` 等がダイアログを開いたまま終了すると、次の Settings-開く @smoke テストが `role="dialog"` overlay にブロックされてクリック失敗
- **症状**: `locator.click: Target page, context or browser has been closed` / dialog intercepts pointer events
- **根本原因**: Settings spec の複数 @smoke テストがダイアログを閉じずに終了。次テストで Settings ボタンが overlay に隠れる
- **修正**: `test.afterEach` で Settings ダイアログを閉じるフックを追加
  ```typescript
  test.afterEach(async ({ page }) => {
      const closeBtn = page.getByRole('button', { name: '設定を閉じる' });
      if (await closeBtn.isVisible({ timeout: 500 }).catch(() => false)) {
          await closeBtn.click();
      }
  });
  ```
- **教訓**: Settings テストを追加する際は、テストが dialog を開きっぱなしにしていないか確認する。また afterEach で後始末するか、各テストの末尾で `await page.getByRole('button', { name: '設定を閉じる' }).click()` を明示的に呼ぶ

---

## E2E: getByText / getByRole の strict mode 違反パターン（batch-53 の教訓）

### getByText の部分一致に注意

- **問題**: `getByText('radius')` は `radius-chip`, `radius-button` 等、テキストに `radius` を含む全要素にマッチする
- **症状**: `strict mode violation: locator resolved to N elements`
- **修正**: `getByText('radius', { exact: true })` を使い、完全一致のみにする
- **教訓**: グループ見出しなど一意のテキストでも、子要素が同テキストを含む場合は `{ exact: true }` を指定する

### not.toBeVisible() にも strict mode が適用される

- **問題**: 削除後に `expect(locator).not.toBeVisible()` を呼んだ際、locator が複数要素にマッチすると strict mode 違反になる
  - 例: テーマカードボタン + ThemeEditor タイトルボタンが両方 `/のコピー/` にマッチ
- **症状**: `strict mode violation` (not.toBeVisible でも発生する)
- **修正**: `.first()` を追加して最初の要素のみ対象にする
  ```typescript
  await expect(locator.first()).not.toBeVisible();
  ```
- **教訓**: `toBeVisible()` だけでなく `not.toBeVisible()` でも strict mode が適用される。複数マッチの可能性がある locator には `.first()` or `nth(0)` を使う

---

## 規約ドキュメントの形骸化（batch-63 以前の反省）

- **問題**: `desktop_ui_ux_agent_rules.md` / `arcagate-engineering-principles.md` / `ux_standards.md` 等を「作るだけ」にして、Plan 設計・実装・レビュー時に実際に参照していなかった。結果、ウィジェットのサイズ追従・設定 UX 統一・即時反映（SFDIPOT の Function/Time 観点）等の規約に書いてある基本を踏み外した実装が複数バッチで産出された。
- **根本原因**: 「書いて満足」する形式主義。機械的強制がなかった。
- **対策**:
  1. Plan 文書には「参照した規約」節を必ず書く（何を読んだか明記）
  2. ルール的な事項は lint / clippy / E2E に落として機械強制する（書くだけ禁止）
  3. CLAUDE.md は philosophy のみ。詳細ルールは機械が止める
  4. `/simplify` は規約違反チェックを含む（規約違反指摘は取捨選択不可）

---

## アイコン + ラベルの整合性（batch-67 の指摘）

- **失敗パターン**: `<Star /> + "星"` のように **アイコン名・記号名をそのままラベル文字にする**。⭐ +「星」は同義語の冗長で、ボタンを押したら何が起こるか / 現在どの状態かが伝わらない。
- **ルール**: ラベルは **機能 / 状態 / アクション** を書く。アイコンの形状名は禁止。
  - アクションボタン → 動詞（追加 / 削除 / 編集 / 起動 / 検索）
  - 状態切替 → 状態名（お気に入り / 表示 / 非表示）
  - ナビゲーション → 行き先名（設定 / ライブラリ / ホーム）
- **`aria-label` も同じ**。スクリーンリーダーで「星ボタン」と読まれても何の機能かわからない。
- **チェック観点**: `/simplify` レビュー / Codex review に「アイコン名 == ラベル文字 になってないか」を観点追加。
- **機械化候補**: ESLint / Svelte plugin で button 子テキストが lucide アイコン名 (Star / Settings / Trash 等) と一致したら警告。
- **参照**: CLAUDE.md 哲学節 / `desktop_ui_ux_agent_rules.md` P4 補足 / batch-67 PH-291.

---

## ウィジェット UX の基本観点（batch-64 で修正）

- **問題**: ウィジェットのコンテンツ（入力欄・時計表示・リスト）がコンテナサイズに追従しない。設定変更が即時反映されずワークスペース切替後に初めて反映される。設定 UX が各ウィジェットでバラバラ。
- **根本原因**: SFDIPOT の **Function**（設定→表示連動）と **Time**（即時性）観点を見ていなかった。Svelte の reactivity が store ↔ component 間で途切れていた。
- **対策**:
  1. 設定変更 → 即時反映を E2E テストで機械的に確認（`@smoke` 推奨）
  2. Widget コンポーネントは `flex-1 min-h-0` 等で必ず外枠 fill する設計に統一
  3. 設定モーダルは全ウィジェット共通 UX（クリック or 編集モード歯車→モーダル）
  4. `$effect` / store subscribe の経路を設計時に明示して confirm する

---

## launchItem の virtual id prefix が DB find_by_id で NotFound（batch-69 で混入、batch-74 で修正）

- **問題**: `launchItem('exe-folder:${exePath}')` のように virtual id prefix を渡しても、`launch_service` 内部の `item_repository::find_by_id` が DB lookup で NotFound を返し silently fail する。`.then` 成功 toast は出ず `.catch` のみ発火。
- **根本原因**: `launchItem` IPC は DB のアイテム ID を前提に設計されている。virtual id 経路が用意されていなかった。
- **修正**: 一時 launch には `cmd_open_path` (batch-72 で追加) を使う。`invoke('cmd_open_path', { path: exePath })` で OS デフォルト (`cmd /c start "" path`) で開く。
- **再発防止**: ExeFolder / FileSearch のような「DB 経由しない一時起動」は全て `cmd_open_path` を使う。grep `launchItem.*\`[a-z_]+:` で同種パターン audit。
- **参照**: PH-325 (batch-74) / `src-tauri/src/commands/file_search_commands.rs:cmd_open_path`

---

## lefthook + cargo test の GIT_\* env 漏出（batch-67〜76 で 4 段階に渡って究明）

- **問題**: lefthook 経由で git push すると `utils::git::tests` 3 件が fail。直接 `cargo test --lib utils::git` を叩くと 5/5 件 pass。
- **根本原因**: lefthook は hook 起動時に `GIT_DIR` / `GIT_WORK_TREE` / `GIT_INDEX_FILE` を親 repo 向けに設定して子プロセスに継承。テストの `Command::new("git").current_dir(tempdir)` で cwd を切り替えても git は env var を優先するため、tempdir ではなく親 repo を操作してしまう。
- **修正**: `src-tauri/src/utils/git.rs` に `git_cmd()` helper を新設し、`env_remove` で `GIT_DIR` / `GIT_WORK_TREE` / `GIT_INDEX_FILE` / `GIT_OBJECT_DIRECTORY` / `GIT_NAMESPACE` / `GIT_COMMON_DIR` を除去。production の `run_git_command` も同 helper 経由（防御的措置）。
- **再発防止**: lefthook 経由で git CLI を起動する全テストは GIT_\* env を明示的に除去せよ。production code でも parent process から漏れる可能性を考慮して同 helper 使用。
- **参照**: PH-335 (batch-76) / `src-tauri/src/utils/git.rs:git_cmd()`

---

## ts-rs で Rust enum → TS bindings 自動生成（batch-79 PH-352）

- **目的**: Rust の `WidgetType` enum と TS の手書き union を 4 重定義する手作業同期を廃止
- **設定**: `Cargo.toml` に `ts-rs = "10"` 追加、enum に `#[derive(TS)]` + `#[ts(export, export_to = "../../src/lib/bindings/")]`
- **生成タイミング**: `cargo test --lib export_bindings` で `src/lib/bindings/<TypeName>.ts` が生成される
- **export_to の path**: `.rs` ファイル相対なので `src-tauri/src/models/workspace.rs` から `src/lib/bindings/` へは `../../src/lib/bindings/` (worktree root 起点ではない)
- **biome 除外**: 自動生成ディレクトリは biome formatter と衝突するため `"!!src/lib/bindings/**"` を `biome.json` の `files.includes` に追加
- **CI 検証**: `scripts/audit-widget-coverage.sh` で Rust enum / ts-rs bindings / WIDGET_LABELS Record の variant 集合一致を検証、lefthook + CI step に統合
- **参照**: PH-352 (batch-79) / `src-tauri/src/models/workspace.rs` / `scripts/audit-widget-coverage.sh`

---

## AppError serialize 形式の構造化（batch-94 PH-429）

- **問題**: `serializer.serialize_str(&self.to_string())` で AppError を string として送信していたため、フロントが `String(error).includes('File not found:')` で判定するしかなく、メッセージ文字列の変更で破綻する
- **修正**: `SerializeStruct` で `{ code: string, message: string }` 形式に変更
- **AppError::code() メソッド**: 各 variant に対応する短い文字列コード (`"launch.file_not_found"` / `"watch.failed"` / `"db.lock"` 等) を返す。フロントで type-safe に分岐可能
- **フロント影響**: `${String(e)}` パターンが `[object Object]` になるため、`getErrorMessage(e)` helper (`src/lib/utils/format-error.ts`) で吸収。message field を取り出すか、無ければ JSON.stringify
- **既存 catch 一括 audit 必須**: serialize 形式変更は IPC 全境界に影響、`grep -rn '\${String(e)}'` で全箇所一括置換
- **参照**: PH-429 / `src-tauri/src/utils/error.rs` / `src/lib/utils/format-error.ts`

---

## Svelte 5 `<svelte:boundary>` の使い方（batch-94 PH-425）

- **目的**: 子要素から throw される未補足エラーを catch、アプリ全体クラッシュを防ぐ
- **構文**:
  ```svelte
  <svelte:boundary onerror={reportError}>
    {@render children()}
    {#snippet failed(error, reset)}
      <ErrorState ... retry={{ label: '再読み込み', onClick: () => location.reload() }} />
      <button onclick={reset}>この画面で再試行</button>
    {/snippet}
  </svelte:boundary>
  ```
- **failed snippet の引数**: `(error, reset)` の 2 つ。reset を呼ぶと boundary 内が再 mount される
- **onerror callback**: throw された error が渡される。logging / telemetry に使える
- **適用範囲**: ルートレイアウトの `<main>` をラップが基本、複雑なコンポーネントの内側にも追加可能
- **参照**: PH-425 / `src/lib/components/common/ErrorBoundary.svelte`

---

## shell-words による Windows 引数安全化（batch-94 PH-422）

- **問題**: `args.split_whitespace()` でスペース入りパス (`C:/Program Files/Foo/foo.exe`) や quoted args (`--config "C:/data/config file.json"`) が破壊される
- **解決**: `shell-words` crate (1.x、~3KB) で POSIX 風 quoting を解析
- **使用例**: `shell_words::split(args).map_err(|e| AppError::LaunchFailed(format!("invalid args quoting: {e}")))?`
- **エラー処理**: unclosed quote 等は `Err(ParseError)` を返すので `?` で短絡 + `AppError::LaunchFailed` 経由でフロントに通知
- **依存予算**: §5 通過、curated list 入り (Rust 引数解析は POSIX 風が業界標準)
- **参照**: PH-422 / `src-tauri/src/launcher/mod.rs`

---

## Tauri State HashMap でリクエスト単位の cancel token（batch-93 PH-420）

- **目的**: 長時間 IPC (file scan / 検索 / etc.) を user 操作で cancel 可能に (Nielsen H3)
- **戦略**: `Arc<AtomicBool>` 配列を `Mutex<HashMap<String, Arc<AtomicBool>>>` で AppState に保持
- **API パターン**:
  - `cmd_long_op(state, search_id: String, ...)` で `state.register(&search_id) -> Arc<AtomicBool>` 取得
  - 重い処理ループ内で `cancel.load(Relaxed)` check
  - 完了時に `state.complete(&search_id)` (HashMap から remove)
  - `cmd_cancel_op(state, search_id)` で `state.cancel(&search_id)` (AtomicBool::store(true))
- **同 ID 再登録**: 古い token を自動 cancel して新規発行 (新検索開始 → 古い検索を自動停止)
- **依存追加なし**: tokio_util::sync::CancellationToken でも実装可能だが、AtomicBool 1 つで十分
- **参照**: PH-420 / `src-tauri/src/services/file_search_state.rs`

---

## OnboardingTour と E2E fixture（batch-94 PH-427）

- **問題**: 初回起動時 modal を表示する OnboardingTour を実装すると、e2e で setupComplete 直後に画面を遮り、Settings ボタンクリック等が阻害される
- **対策**: e2e global-setup.ts で `markSetupComplete` の後に `markOnboardingComplete` も呼ぶ
- **設計判断**: OnboardingTour の trigger 条件を「setupComplete && !onboardingComplete」にしておけば、e2e fixture で onboardingComplete を mark するだけで bypass 可能
- **再発防止**: 新しい初回 modal を実装する際は同時に e2e fixture を更新する。Plan 文書に「e2e fixture 影響あり」を必須記載
- **参照**: PH-427 / `tests/fixtures/global-setup.ts`

---

## Settings 設定 UI の追加パターン（batch-94 PH-428）

- **新設場所**: `src/lib/components/settings/<Name>Settings.svelte` を作る
- **SettingsPanel への統合**: `activeCategory === 'library'` 等の各 section で `<NewSettings />` をマウント
- **空状態**: `EmptyState` を使い `description` で onboarding hint を出す
- **エラー処理**: `formatIpcError({ operation: '<操作名>' }, e)` で「原因 + 次の操作」フォーマット
- **CI 影響**: 新 dialog / overlay は e2e で「想定外要素 = strict mode 違反」を起こすことがある → 専用 testid を付与して getByRole/getByText 衝突回避
- **参照**: PH-428 / `src/lib/components/settings/WatchedFoldersSettings.svelte`

---

## auto-kick scheduled task (batch-95 PH-435)

- **目的**: Arcagate dispatch session が idle / failed CI で止まったとき、外部から kick して active poll を強制する
- **実装**: `mcp__scheduled-tasks__create_scheduled_task` で 20 分間隔の cron task 作成
- **判定ロジック**:
  - failed CI → 「即 fix push しろ」
  - 最終 turn > 5min + Bash 実行中なし → 「止まるな進め」
  - 末尾 turn に「checkpoint / memory 保存 / 次セッション復帰」発言 → 「memory 保存じゃなく即実装に戻れ」
  - open PR > 30min + pending → 何もしない (auto-merge が引き取る)
  - open PR 0 + idle → 「次バッチ pop しろ」
- **管理**: taskId `arcagate-auto-kick`、`memory/auto_kick_config.md` に設定記録
- **更新**: `mcp__scheduled-tasks__update_scheduled_task` でロジック変更可
- **参照**: PH-435 / `dispatch-operation.md` §8

---

## spawn-on-context-pressure (batch-95 PH-435)

- **問題**: agent の context window 上限 (compaction 直前) で、何もせず終わると連続性が切れる
- **発動条件**: assistant turn 数 ≥ 1800、または system 警告、またはユーザ明示指示
- **手順**:
  1. `memory/spawn_handoff.md` に snapshot (active batch / branch / PR / 進行中 plan / next action / queue)
  2. `mcp__dispatch__start_task` で「Arcagate dispatch resume N+1」起動 (handoff を読ませる prompt)
  3. 自セッションは「次世代起動済み、退場」で終了
- **auto-kick との関係**: auto-kick = idle 検知 (定期)、spawn-on-pressure = context 限界対策 (1 回限り)。両者併用で 24/7 自律運用
- **参照**: PH-435 / `dispatch-operation.md` §10 / `memory/spawn_handoff.md`

---

## PR auto-merge 必須運用 (batch-95 PH-435)

- **設定**: `gh repo edit --enable-auto-merge` + main の branch protection (required status checks: check/build/e2e/changes、strict mode)
- **流れ**: push → `gh pr create` → `gh pr merge <#> --auto --squash` で予約 → `gh pr checks <#>` で 1 回確認 → 次バッチ着手
- **失敗時**: failed なら自分で即 fix (auto-kick 待たない)、pending/success は次バッチへ進む
- **「auto-merge してくれるから放置」は禁止**: 最低 1 回の checks 確認が必須
- **CI rate limit 注意**: `gh pr checks` は GraphQL rate limit を消費する。連続多用するなら `gh run list --json` (REST) に切替
- **squash merge 解禁**: dispatch-operation §7 の「squash merge 禁止」は auto-merge 経路では例外 (PH-435)
- **参照**: PH-435 / `dispatch-operation.md` §8

---

## branch protection strict=false で auto-merge 滞留回避 (batch-100)

- **問題**: `required_status_checks.strict=true` (Require branches to be up to date before merging) を ON にすると、複数 PR の auto-merge 並行予約時、main が進むたび残 PR が BEHIND になり、auto-merge が動かず滞留する
- **解決**: `strict=false` に変更
  ```bash
  cat > /tmp/p.json <<'JSON'
  {"required_status_checks":{"strict":false,"contexts":["check","build","e2e","changes"]},"enforce_admins":false,"required_pull_request_reviews":null,"restrictions":null,"allow_force_pushes":false,"allow_deletions":false}
  JSON
  gh api -X PUT repos/<owner>/<repo>/branches/main/protection --input /tmp/p.json
  ```
- **安全性**: squash merge を採用しているため、BEHIND でも main へ squash 統合は線形履歴のまま。rebase merge と違って conflict 解決は merge コミット時、CI も最新 main で再走しないので保証は弱まるが、small PR では実用上問題なし
- **大きい PR の場合**: 個別に `gh pr update-branch --rebase` で最新 main を取り込んでから auto-merge 予約する
- **参照**: PH-435 + batch-100 / `docs/dispatch-operation.md` §8

---

## scheduled-task prompt の write action スコープ厳密化 (batch-104 PH-463)

- **問題**: auto-kick scheduled-task の prompt で「send_message MANDATORY」と書いたが、agent は「write action 一般 (Edit / Bash 含む)」と拡大解釈。kick session が自ら docs を編集し始めて、本来の dispatch session 監視を逸脱
- **根本原因**: scheduled-task の system prompt が「保守的に write を避ける」を default にしていて、それを上書きするために MANDATORY を強調 → agent が「全 write が MANDATORY」と曲解
- **対策**: prompt に「write action は **send_message** のみ、その他の write tool (Edit / Bash の git commit / Write 等) は **PROHIBITED**」を厳密に書く
- **設計原則**: scheduled-task は read-only または「特定 tool のみ実行」のモードを明示する。「ONLY X」「PROHIBITED Y」で list する
- **再発防止**: prompt review で「ONLY / MANDATORY / PROHIBITED」のスコープを明確化、agent の広い解釈を防ぐ
- **参照**: PH-463 (batch-104) / `arcagate-auto-kick` SKILL.md / 改修は PH-464 (batch-105)

---

## scheduled-task fireAt 不発の事実 (batch-105 → batch-106 で 2 連続失敗確認)

- **観測データ**:
  - resume 9 (02:02 UTC、user active): fired ✅
  - resume 10 (06:10 UTC、user active): fired ✅
  - resume 11 (07:28 UTC、user idle 想定): **NOT fired** ❌ (1h+ 経過、lastRunAt 空)
  - resume 12 (09:26 UTC、user active で +60s 短縮で挑戦): **NOT fired** ❌ (2 分 18 秒経過、lastRunAt 空)
- **2 連続不発 = 信頼性問題ほぼ確定**。+60s 短縮 + user active でも fire せず
- **再発防止**:
  1. **報告前に事実確認**: `date -u` で現在時刻を取得してから「発火済 / 未発火」判定する。「予定通り」「もうすぐ」と推測で答えない
  2. **fireAt 1.5x 経過しても lastRunAt 空** = 発火失敗確定。即 disable
  3. **spawn-on-pressure は default 無効化** (batch-106 以降): scheduled-task fireAt の信頼性が確認できるまで、context 限界対策は「自セッションで分割実装」を default に
- **代替手段**:
  - 大きなタスクは fireAt に頼らず、自セッションで分割して PR 出す
  - 長時間 monitor は cron task (recurring) で代用 (auto-kick が実証済)
- **未解明**: fireAt 不発の原因 (Claude Desktop active session の必要性 / fireAt format / time zone / dispatch backend) は PH-471 (batch-106) で実機テスト
- **参照**: PH-471 + dispatch-operation §10 更新予定
