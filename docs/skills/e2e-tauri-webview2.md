# Skill: Tauri v2 + WebView2 + Playwright E2E テスト

再利用可能なパターン集。Tauri v2 アプリに Playwright E2E を組み込む際の参照資料。

## アーキテクチャ概要

```
Playwright (Node.js)
    │ CDP over localhost:9515
    ▼
WebView2 (Chromium ベース)
    │ window.__TAURI_INTERNALS__.invoke
    ▼
Tauri IPC
    │
    ▼
Rust Backend (Command → Service → Repository → SQLite)
```

---

## CDP 接続の仕組み

### WebView2 のリモートデバッグを有効にする方法

Windows の WebView2 は Chromium ベースのため、CDP（Chrome DevTools Protocol）でリモート操作できる。

**方法: `devtools` feature + 環境変数**

```toml
# Cargo.toml
tauri = { version = "2.x", features = ["tray-icon", "devtools"] }
```

```bash
# 起動時の環境変数
WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9515
```

`devtools` feature は debug_assertions が有効な場合のみ機能し、
release ビルドには影響しない。

### Playwright からの接続

```typescript
const browser = await chromium.connectOverCDP('http://localhost:9515');
const ctx = browser.contexts()[0];
const page = ctx.pages()[0] ?? await ctx.waitForEvent('page');
await page.waitForLoadState('domcontentloaded');
```

**重要な注意点**:

- `connectOverCDP` は新規ブラウザを起動しない。既存 WebView2 に接続する
- `browser.close()` を呼んでも WebView2 プロセスは終了しない（connection を切るだけ）
- WebView2 を終了させるには PID で `process.kill()` を使う

---

## globalSetup / globalTeardown パターン（プロセス管理 + DB 隔離）

### globalSetup.ts の基本構造

```typescript
export default async function globalSetup() {
  // 1. テスト用 DB パスを環境変数に設定
  const dbPath = `tmp/test-${Date.now()}.db`;
  process.env.ARCAGATE_TEST_DB_PATH = dbPath;

  // 2. Tauri プロセスを起動
  const proc = execFile(TAURI_EXE, [], {
    env: {
      ...process.env,
      ARCAGATE_DB_PATH: dbPath,  // DB パスを上書き
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: '--remote-debugging-port=9515',
    },
  });
  process.env.ARCAGATE_TEST_PID = String(proc.pid);

  // 3. CDP が利用可能になるまでポーリング
  await waitForCdp(9515);  // 最大30秒

  // 4. CDP 接続して初期状態を設定（SetupWizard スキップ等）
  const browser = await chromium.connectOverCDP('http://localhost:9515');
  const page = browser.contexts()[0].pages()[0];
  await page.waitForLoadState('domcontentloaded');
  await invoke(page, 'cmd_mark_setup_complete');
  await browser.close();
}
```

### globalTeardown.ts の基本構造

```typescript
export default async function globalTeardown() {
  // 1. Tauri プロセスを終了
  process.kill(Number(process.env.ARCAGATE_TEST_PID));

  // 2. テスト用 DB を削除（WAL モードの残留ファイルも含む）
  const db = process.env.ARCAGATE_TEST_DB_PATH;
  for (const suffix of ['', '-wal', '-shm']) {
    try { rmSync(db + suffix); } catch {}
  }
}
```

### DB 隔離のための Rust 側変更

```rust
// lib.rs: setup() 内
let db_path = std::env::var("ARCAGATE_DB_PATH")
    .map(std::path::PathBuf::from)
    .unwrap_or_else(|_| app_data_dir.join("arcagate.db"));
```

---

## `window.__TAURI_INTERNALS__.invoke` 経由の IPC 呼び出し

Playwright は WebView2 の JavaScript 環境にアクセスできるため、
`page.evaluate` 経由で Tauri IPC を直接呼び出せる。

```typescript
export async function invoke<T>(
  page: Page,
  cmd: string,
  args?: Record<string, unknown>,
): Promise<T> {
  return page.evaluate(
    ([command, arguments_]) =>
      window.__TAURI_INTERNALS__.invoke(command, arguments_),
    [cmd, args ?? {}],
  );
}
```

### 使用例

```typescript
// アイテム作成
const item = await invoke<Item>(page, 'cmd_create_item', {
  input: { item_type: 'exe', label: 'Test', target: 'C:\\test.exe' }
});

// 設定完了マーク
await invoke<void>(page, 'cmd_mark_setup_complete');
```

---

## SetupWizard 等の初回 modal をバイパスする汎用パターン

多くの Tauri アプリには初回起動時のセットアップ画面がある。
テスト用の空 DB では毎回表示されるため、globalSetup でバイパスする。

```typescript
// globalSetup.ts で Tauri 起動直後に呼ぶ
try {
  await invoke(page, 'cmd_mark_setup_complete');
  await page.reload();
  await page.waitForLoadState('domcontentloaded');
} catch {
  // 既に完了済みなら無視
}
```

**条件**:

- SetupWizard のスキップ用 IPC コマンドが存在すること
- IPC コマンドが DB に永続化すること（リロード後も有効）

---

## よくある落とし穴

### `pages()[0]` が空

Tauri 起動直後は WebView2 がまだページを開いていない場合がある。

```typescript
// NG: pages()[0] が undefined になる可能性
const page = ctx.pages()[0];

// OK: フォールバックで waitForEvent を使う
const page = ctx.pages()[0] ?? await ctx.waitForEvent('page');
```

### `browser.close()` でプロセスが死ぬ問題

`connectOverCDP` で接続した browser の `close()` は接続を切るだけで
Tauri/WebView2 プロセスは生き続ける（これが正しい動作）。

fixture で `browser.close()` を呼んでも Tauri は終了しない。
teardown の `process.kill(pid)` で終了させる。

### CDP ポートの競合

複数の E2E セッションが同時に起動する場合（CI の並列ジョブ等）、
同じポート（9515）を使うと競合する。
`workers: 1` を設定して1プロセスのみ動かすことで回避。

### WebView2 の CDP 利用可能タイミング

`/json/version` エンドポイントが 200 を返しても、
WebView2 がまだページを完全に初期化していない場合がある。

```typescript
await waitForCdp(port);  // /json/version が 200 になるまで待つ
const page = ctx.pages()[0] ?? await ctx.waitForEvent('page');
await page.waitForLoadState('domcontentloaded');  // DOM 初期化まで待つ
```

### Tauri IPC は Playwright の通常ブラウザでは使えない

`chromium.launch()` で起動した通常の Chromium には
`window.__TAURI_INTERNALS__` が存在しない。
必ず `chromium.connectOverCDP()` で既存の WebView2 に接続すること。

---

## テストの fixture パターン

```typescript
// tests/fixtures/tauri.ts
export const test = base.extend<{ page: Page }>({
  page: async ({}, use) => {
    const port = process.env.ARCAGATE_TEST_CDP_PORT ?? '9515';
    const browser = await chromium.connectOverCDP(`http://localhost:${port}`);
    const ctx = browser.contexts()[0];
    const page = ctx.pages()[0] ?? await ctx.waitForEvent('page');
    await page.waitForLoadState('domcontentloaded');
    await use(page);
    await browser.close();  // connection のみ切断
  },
});
```

各テストで新しい CDP connection を張り、テスト後に切断する。
WebView2 プロセス自体は globalTeardown まで継続する。
