---
name: e2e-tauri-webview2
description: "Load this skill when working on Playwright E2E tests for Tauri v2 apps using WebView2 (CDP). Triggers: adding/modifying E2E tests, debugging test failures, configuring CI for E2E, checking test artifacts (traces, screenshots, reports), or when asked about testInfo.attach(), globalSetup/Teardown, CDP connection, or IPC in tests."
metadata:
  author: arcagate
  version: 1.1.0
---

# Tauri v2 + WebView2 + Playwright E2E テスト

## アーキテクチャと起動フロー

```
pnpm test:e2e
  │
  ├─ playwright.config.ts の webServer.command: 'pnpm dev'
  │       └─ Vite dev server を http://localhost:5173 で起動
  │
  ├─ globalSetup.ts
  │       └─ Tauri debug binary を起動
  │               tauri.conf.json の devUrl: "http://localhost:5173" をロード
  │               WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS で CDP ポート開放
  │
  └─ tests/fixtures/tauri.ts (fixture)
          └─ chromium.connectOverCDP('http://localhost:9515') で WebView2 に接続
                  page.waitForURL(/^http:\/\/localhost:5173/)  ← 必須
                  page.waitForLoadState('domcontentloaded')    ← 必須
```

**重要な前提**: debug バイナリは `tauri.conf.json` の `devUrl` を使って Vite の出力を表示する。
`waitForURL(localhost:5173)` は正しい設計であり、不要ではない。
CDP が疎通してもページが `about:blank` のままのケースが存在するため必須。

---

## Cargo.toml / 環境変数の設定

```toml
# src-tauri/Cargo.toml
[dependencies]
tauri = { version = "2.x", features = ["tray-icon", "devtools"] }
```

```bash
# テスト実行時
WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9515 pnpm test:e2e
```

`devtools` feature は `debug_assertions` が有効な場合のみ機能する（release ビルドに影響しない）。
CDP ポートの開放は `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS` 環境変数でのみ制御される。

---

## fixture パターン（tests/fixtures/tauri.ts）

```typescript
export const test = base.extend<{ page: Page }>({
  page: async (_fixtures, use) => {
    const port = process.env.ARCAGATE_TEST_CDP_PORT ?? '9515';
    const browser = await chromium.connectOverCDP(`http://localhost:${port}`);
    const ctx = browser.contexts()[0];
    const page = ctx.pages()[0] ?? await ctx.waitForEvent('page');
    await page.waitForURL(/^http:\/\/localhost:5173/);     // CDP 疎通後でも about:blank の可能性あり
    await page.waitForLoadState('domcontentloaded');
    await use(page);
    await browser.close();  // connection のみ切断（Tauri プロセスは終了しない）
  },
});
```

---

## globalSetup / globalTeardown

### globalSetup.ts

```typescript
export default async function globalSetup() {
  const dbPath = `tmp/test-${Date.now()}.db`;
  process.env.ARCAGATE_TEST_DB_PATH = dbPath;

  const proc = execFile(TAURI_EXE, [], {
    env: {
      ...process.env,
      ARCAGATE_DB_PATH: dbPath,
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: '--remote-debugging-port=9515',
    },
  });
  process.env.ARCAGATE_TEST_PID = String(proc.pid);

  await waitForCdp(9515);   // /json/version が 200 になるまで最大30秒待つ

  const browser = await chromium.connectOverCDP('http://localhost:9515');
  const ctx = browser.contexts()[0];
  const page = ctx.pages()[0] ?? await ctx.waitForEvent('page');
  await page.waitForURL(/^http:\/\/localhost:5173/);
  await page.waitForLoadState('domcontentloaded');
  await invoke(page, 'cmd_mark_setup_complete');
  await browser.close();
}
```

### globalTeardown.ts（Windows プロセスツリー対応）

```typescript
import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';

export default async function globalTeardown() {
  const pid = process.env.ARCAGATE_TEST_PID;
  if (pid) {
    if (process.platform === 'win32') {
      try { execSync(`taskkill /PID ${pid} /T /F`); } catch { /* already terminated */ }
    } else {
      try { process.kill(Number(pid)); } catch { /* already terminated */ }
    }
  }

  const db = process.env.ARCAGATE_TEST_DB_PATH;
  if (db) {
    for (const suffix of ['', '-wal', '-shm']) {
      try { rmSync(db + suffix); } catch { /* file may not exist */ }
    }
  }
}
```

**Windows 注意**: `process.kill(pid)` はサブプロセスツリーを残す。
`taskkill /PID /T /F` でプロセスツリーごと強制終了すること。

---

## IPC 呼び出し（tests/helpers/ipc.ts）

```typescript
export async function invoke<T>(
  page: Page,
  cmd: string,
  args?: Record<string, unknown>,
): Promise<T> {
  return page.evaluate(
    ([command, arguments_]) =>
      (window as unknown as TauriWindow).__TAURI_INTERNALS__.invoke(command, arguments_),
    [cmd, args ?? {}],
  ) as unknown as T;
}
```

**注意**: `page.evaluate(...)` の戻り値型は `unknown`。`as unknown as T` キャストが必要。
IPC 経由の変更は Svelte ストアに通知されない。UI 確認前は `page.reload()` + `waitForLoadState('domcontentloaded')` でストアを再初期化すること。

---

## testInfo.attach() による成功証跡の保存

```typescript
test('アイテムを作成できること', async ({ page }, testInfo) => {
  // ... テストロジック ...
  await expect(page.getByText('アイテム名')).toBeVisible();

  // 成功証跡を HTML report に添付
  const screenshot = await page.screenshot({ fullPage: true });
  await testInfo.attach('success-items-create', { body: screenshot, contentType: 'image/png' });
});
```

- グローバル設定は `screenshot: 'only-on-failure'` を維持する
- 代表テストで `testInfo.attach()` を使い HTML report に成功証跡を埋め込む
- `test` の引数に `testInfo` を追加すること: `async ({ page }, testInfo) => {`
- HTML report を開けば画像が直接確認できる（`start tmp/playwright-report/index.html`）

---

## 証跡の設計

```
【常時 upload】
  HTML report (tmp/playwright-report/)
    └── testInfo.attach() で埋め込まれた成功証跡スクリーンショット

【失敗時・リトライ後成功含む upload】
  test-results/
    ├── trace.zip       ← trace: 'on-first-retry' の出力
    ├── *.png           ← screenshot: 'only-on-failure' の出力
    └── *.webm          ← video: 'retain-on-failure' の出力
```

CI e2e.yml での upload 設定:

```yaml
- name: Upload Playwright report
  if: ${{ !cancelled() }}
  uses: actions/upload-artifact@v4
  with:
    name: playwright-report
    path: tmp/playwright-report/

- name: Upload test results (traces, videos, failure screenshots)
  if: ${{ !cancelled() }}        # failure() ではなく !cancelled() — リトライ後成功の trace も回収
  uses: actions/upload-artifact@v4
  with:
    name: test-results
    path: test-results/          # デフォルト保存先に合わせる（tmp/playwright-traces/ ではない）
```

---

## よくある落とし穴

| 症状                                                           | 原因                                        | 対処                                                              |
| -------------------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------- |
| CDP 疎通後もページが `about:blank`                             | WebView2 初期化タイミング                   | `page.waitForURL(/^http:\/\/localhost:5173/)` を追加              |
| IPC 後 UI に反映されない                                       | IPC 変更が Svelte ストアをバイパス          | `page.reload()` + `waitForLoadState('domcontentloaded')`          |
| Escape が届かない                                              | パレット input にフォーカスがない           | `await input.focus()` を先に呼ぶ                                  |
| `getByText` で strict mode 違反                                | input.value にもマッチ                      | `.locator('.max-h-80').getByText(...)` で ResultList に限定       |
| WorkspaceView が更新されない                                   | タブが既に active で `onMount` が発火しない | IPC 後 `page.reload()` → タブクリックで再 mount                   |
| `getByRole('dialog')` が失敗                                   | AddWidgetDialog に `role="dialog"` がない   | 内部ボタン `getByRole('button', { name: 'よく使うもの' })` で代替 |
| `getByRole('button', { name: 'ワークスペース' })` が複数マッチ | ワークスペース名タブにも一致                | `{ exact: true }` を追加                                          |
| Windows でプロセスが残る                                       | `process.kill()` がサブツリーを残す         | `taskkill /PID /T /F` を使う                                      |
| CI で Vite 起動タイムアウト                                    | cold start が遅い                           | `webServer.timeout: 60_000` に延長                                |

---

## ローカル実行手順

```bash
# 1. Rust debug binary ビルド（初回 or Rust 変更後）
cargo build --manifest-path src-tauri/Cargo.toml

# 2. E2E 実行
WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9515 pnpm test:e2e

# 3. HTML report を確認（成功証跡スクリーンショットが添付されていること）
start tmp/playwright-report/index.html

# 4. 失敗時 — test-results/ に trace/screenshot/video が生成されること
ls test-results/
```

---

## 失敗時切り分けチェックリスト

1. **CDP 接続失敗** → `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS` が設定されているか確認
2. **ページが `about:blank`** → fixture に `waitForURL` があるか確認
3. **IPC エラー** → `window.__TAURI_INTERNALS__` が存在するか（Tauri ネイティブウィンドウで実行されているか）
4. **UI アサーション失敗** → IPC 後に `page.reload()` しているか
5. **Escape が届かない** → `input.focus()` を先に呼んでいるか
6. **Windows でプロセスが残る** → teardown に `taskkill /T /F` があるか
7. **CI で Vite タイムアウト** → `webServer.timeout: 60_000` になっているか
8. **trace が回収されない** → `e2e.yml` の artifact path が `test-results/` になっているか（`tmp/playwright-traces/` ではない）
