# Distribution Rollback / kill-switch SOP

PH-458 (batch-103) で新設。バグ release 公開後の緊急対応手順。

## 1. 検知

以下のいずれかでバグ release を発覚:

- **ユーザ報告**: GitHub Issue / Discord / メール等で複数報告
- **クラッシュ率 spike**: tauri-plugin-log 永続ログから異常パターン検出 (将来 Telemetry で自動化)
- **dispatch-log 異常**: CI / e2e / smoke-test の post-release 実行で fail
- **自動 monitoring** (将来): Sentry / GitHub Actions periodic check

## 2. 判断 (5 分以内)

| 重大度   | 判断        | 例                                         |
| -------- | ----------- | ------------------------------------------ |
| **軽微** | hotfix 待ち | UI 軽微バグ、特定機能のみ影響              |
| **重大** | 即 rollback | 起動失敗 / データ破損 / セキュリティ脆弱性 |

軽微なら hotfix release を 24h 以内に作成、ユーザに「次バージョンで修正」と告知。

## 3. Rollback 手順 (重大時)

### Step 1: GitHub Releases で問題 release 降格

```bash
gh release edit v0.2.0 --draft  # or --prerelease
# Release 一覧から問題版を非公開化、ユーザの updater は新版表示しなくなる
```

### Step 2: 1 つ前の release を最新に再昇格

```bash
gh release edit v0.1.9 --latest
# v0.1.9 が最新扱いになる、ただしユーザの自動 downgrade は発生しない (security 上正しい挙動)
```

### Step 3: ユーザへの周知

- GitHub Release ページに「KNOWN ISSUE」を明記
- Issue / Discussion にスティッキー
- README に一時的な warning banner

### Step 4: 既存ユーザの対処

- v0.2.0 をインストール済のユーザは **自動 downgrade されない** (security)
- 手動対処手段:
  1. v0.1.9 .msi / setup.exe を直接 download + 上書きインストール
  2. データ (`%APPDATA%/com.arcagate.desktop/`) は保持される (DB マイグレーションが forward-only でなければ)

## 4. Hotfix release (軽微時)

```bash
git checkout -b hotfix/v0.2.1
# fix
git push -u origin hotfix/v0.2.1
gh pr create --base main --title "hotfix: <issue>"
# auto-merge → main
git tag -a v0.2.1 -m "Hotfix v0.2.1"
git push origin v0.2.1  # → release.yml 自動発火
```

## 5. 事後分析 (post-mortem)

48h 以内に:

- 原因特定 (どの commit / PR / Plan が混入経路)
- 再発防止策 (e2e 追加 / lint rule / Plan 受け入れ条件強化)
- `docs/lessons.md` に追記
- 大規模なら `docs/l1_requirements/post-mortem-YYYY-MM-DD.md` 新設

## 6. kill-switch (将来、batch-104 以降)

サーバ側 config で「強制無効化」する仕組み。

候補設計:

- GitHub Releases に `disabled.json` を追加、起動時に fetch
- 該当 version なら起動時 dialog「お使いのバージョンに重大な問題があります、最新版に更新してください」
- 設計 + 実装は batch-104 以降で検討

## 参照

- `RELEASE.md` (メンテナ向け Release 手順)
- `distribution-readiness.md` (Release Go/No-go 判定)
- `codex-review-batch-101.md` Q4 #6 (rollback / kill-switch SOP 推奨)
