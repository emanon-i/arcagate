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
