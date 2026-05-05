# Foundation §5: CI/CD

[foundation.md](./foundation.md) §5 詳細。

## 5. CI/CD

### GitHub Actions

| ワークフロー | ファイル                    | 概要                                                      |
| ------------ | --------------------------- | --------------------------------------------------------- |
| E2E テスト   | `.github/workflows/e2e.yml` | windows-latest + CDP Playwright、cargo build + pnpm build |

#### e2e.yml の要点

- **ランナー**: `windows-latest`（WebView2 が必須なため）
- **手順**: `cargo build` → `pnpm build` → `playwright test`
- **アーティファクト**:
  - `playwright-report` — 保持 30 日（常時アップロード）
  - `test-results` — 保持 7 日（`if: ${{ !cancelled() }}` 条件）
- **webServer タイムアウト**: `60_000` ms（Tauri 起動待ち）
- **DB 分離**: `ARCAGATE_DB_PATH` 環境変数でテスト用一時 DB を指定
