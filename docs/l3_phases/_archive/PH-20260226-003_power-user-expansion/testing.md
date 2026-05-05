# テスト戦略

Arcagate のテスト構成と実行方法。

## テスト種別

| 種別                    | 責務                             | 実行コマンド        | 実行環境           |
| ----------------------- | -------------------------------- | ------------------- | ------------------ |
| Rust unit / integration | Repository・Service の全関数     | `cargo test`        | ローカル + CI      |
| vitest                  | SvelteKit ストア・ユーティリティ | `pnpm test`         | ローカル + CI      |
| smoke-test.sh           | CLI バイナリの IPC 経路          | `pnpm verify:smoke` | ローカル + CI      |
| Playwright E2E          | UI + IPC + 全経路                | `pnpm test:e2e`     | CI（E2E workflow） |

## 各種別の責務詳細

### Rust unit / integration（111件）

- **Repository**：公開関数ごとに unit test。`NotFound` など全エラーケースを含める
- **Service**：DB 操作を伴うビジネスロジックの代表シナリオ + バリデーションエラー
- **Command**：thin wrapper のため個別テスト不要。E2E で代替確認
- `initialize_in_memory()` を全テストで使用（`DbState(Mutex::new(conn))` を返す）

### Playwright E2E（11件）

UI + IPC + Command + Service + Repository + SQLite の全経路を通すテスト。

| ファイル          | テスト件数 | 確認内容                                             |
| ----------------- | ---------- | ---------------------------------------------------- |
| items.spec.ts     | 3          | IPC 経由アイテム作成→一覧反映、UI フォーム追加、削除 |
| palette.spec.ts   | 4          | 開閉、検索、電卓（=1+2*3）、ArrowDown ナビゲーション |
| workspace.spec.ts | 2          | ワークスペース作成、ウィジェット追加                 |
| settings.spec.ts  | 2          | 設定パネル表示、ホットキー IPC 読み込み              |

**launchItem は E2E で直接テストしない**（OS の実プロセス起動は CI 副作用が大）。
Rust unit test で動作確認済み。

---

## ローカル実行

### 前提条件

```bash
# Rust debug バイナリをビルド
cargo build --manifest-path src-tauri/Cargo.toml

# フロントエンドをビルド
pnpm build

# Playwright Chromium をインストール（初回のみ）
pnpm exec playwright install chromium
```

### E2E テスト実行

```bash
# Windows Git Bash
WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9515 pnpm test:e2e
```

### レポート確認

```bash
# HTML レポートを開く
start tmp/playwright-report/index.html
```

### デバッグ方法（UI あり）

```bash
# Playwright UI モードで実行（ブラウザ操作を視覚的に確認できる）
pnpm exec playwright test --ui
```

---

## CI 実行

GitHub Actions の `E2E` ワークフロー（`.github/workflows/e2e.yml`）が
`windows-latest` 上で自動実行される。

- `playwright-report` Artifact（30日保持）: HTML レポートをダウンロードして確認
- `test-results` Artifact（7日保持）: trace・動画・失敗時スクリーンショット。キャンセル以外で常時回収（`!cancelled()`）

---

## テスト追加ルール

### IPC ヘルパーの追加

新しい IPC コマンドをテストに使う場合は `tests/helpers/ipc.ts` に関数を追加する。

```typescript
// 例: カテゴリ一覧取得
export async function getCategories(page: Page): Promise<Category[]> {
  return invoke<Category[]>(page, 'cmd_get_categories');
}
```

### SetupWizard スキップ

テスト用 DB は空の状態から始まるため `is_setup_complete = false`。
`globalSetup` で `cmd_mark_setup_complete` を呼ぶことで全テストがスキップされる。
各テストで SetupWizard が表示された場合は `globalSetup` の処理を確認すること。

### DB クリーンアップ必須

`globalTeardown` が `tmp/test-*.db`（+ -wal / -shm）を削除する。
テスト内で DB を直接操作する場合も、作成したデータは teardown で削除されるため
テスト間の独立性は保たれる。

### launchItem テスト禁止

`cmd_launch_item` は OS の実プロセス（.exe / .url）を起動するため
CI 環境での副作用が大きい。E2E テストに含めないこと。
動作確認は Rust unit test（`launch_service`）で行う。
