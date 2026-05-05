---
id: PH-20260427-461
status: done
batch: 104
type: 整理
era: Distribution Era Hardening
---

# PH-461: Crash 監視 設計 (Codex Q4 #7 補完)

## 問題

未補足 panic / 致命エラー の発覚が手動報告のみ。クラッシュ率の数値把握ができず、release 品質判定が主観依存。

## 設計案 (実装は別 plan)

### Rust 側 候補

| ライブラリ         | 特徴                             | 採用         |
| ------------------ | -------------------------------- | ------------ |
| **sentry-rust**    | 標準、Sentry SaaS or self-hosted | ⭐ 第 1 候補 |
| panic-handler 自前 | 簡素、JSON dump → file           | 軽量代替     |
| backtrace-rs       | スタックトレース取得 helper      | 副次         |

### フロント側 候補

| ライブラリ                       | 特徴                             | 採用         |
| -------------------------------- | -------------------------------- | ------------ |
| **@sentry/svelte** + browser     | Svelte 5 boundary 内未補捉エラー | ⭐ 第 1 候補 |
| ErrorBoundary + cmd_log_frontend | 既存 PH-425 の延長で自前 IPC     | 軽量代替     |

### 推奨選択

**Sentry self-hosted** で Rust + フロント両対応:

- Open source (Apache 2)
- Docker compose で立ち上げ可
- グローバルダッシュボード = クラッシュ率 / バージョン別 trend / 個別 stack trace

代替 (運用負荷低い):

- **Sentry SaaS Free tier** (月 5k errors)
- 個人プロジェクトなら十分

### Privacy 配慮 (Telemetry PH-460 と同じ原則)

- スタックトレースに含まれる個人情報を redact
- file path 抽象化 (`%APPDATA%/...` → `<APPDATA>/...`)
- ユーザ DB の内容は送信しない

### 実装ステップ (別 plan で着手)

1. Sentry self-hosted setup (or Free tier 登録)
2. `src-tauri/src/lib.rs` で `sentry::init` (DSN は env var)
3. `src/lib/components/common/ErrorBoundary.svelte` の `reportError` を Sentry SDK に変更 (PH-425 の延長)
4. Settings > データ で Opt-out toggle (Telemetry と同じ)
5. README にクラッシュ報告のプライバシー記述

## 受け入れ条件

- [x] Rust / フロント側ライブラリ候補比較
- [x] Sentry self-hosted 推奨 + 代替案
- [x] Privacy redact ポリシー
- [x] 実装ステップ概要 (別 plan)

## 別 plan に切り出し

- PH-468: Sentry 統合実装
- PH-469: redact policy 実装 (path 抽象化 / DB 内容除外)
