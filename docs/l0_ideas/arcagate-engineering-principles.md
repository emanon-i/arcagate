---
status: living
---

# Arcagate エンジニアリング原則

設計判断の拠り所となる技術基準。「なぜそうするか」を一言で答えられる水準を目指す。
`/simplify` 実行時・設計レビュー時はここを参照して取捨選択する。

## 1. アーキテクチャ境界

### 1.1 レイヤー依存規則

```
UI（Svelte）
  └─ IPC（invoke/listen）
       └─ Commands（Tauri handlers）
            └─ Services（ビジネスロジック）
                 └─ Repositories（DB アクセス）
                      └─ SQLite（rusqlite）
```

- 依存は上から下への一方向のみ。逆参照禁止
- UI は IPC 経由でのみバックエンドと通信する（直接 Repository 呼び出し不可）
- Repository 間の相互参照禁止。複数 Repository の結合は Service 層で行う
- Service 層が全エントリーポイント（UI / CLI）の共通経路

### 1.2 フロントエンド / バックエンド分担

| 層             | 責務                                   | 禁止事項                         |
| -------------- | -------------------------------------- | -------------------------------- |
| Svelte（UI）   | 表示・インタラクション・状態保持       | ビジネスルール実装、直接 DB 操作 |
| Tauri Commands | IPC 薄膜（型変換・エラー変換のみ）     | ビジネスロジック記述             |
| Services       | ユースケース実装・トランザクション管理 | UI 依存コードの混入              |
| Repositories   | SQL 実行・モデル変換                   | 他 Repository の呼び出し         |

### 1.3 状態管理

- グローバル状態は `src/lib/state/*.svelte.ts` に集約（Svelte 5 runes）
- `$state` / `$derived` / `$effect` を使用。Svelte 4 の `writable` / `derived` は使わない
- 副作用（IPC 呼び出し）は `$effect` 内か明示的なイベントハンドラで行う。`$derived` に副作用を入れない

---

## 2. エラーハンドリング

- 統一エラー型 `AppError`（`thiserror`）を全レイヤーで使用
- `anyhow` / `Box<dyn Error>` / `unwrap()` は製品コードで使わない（テストは除く）
- IPC: `Result<T, AppError>` → Tauri が自動シリアライズ → フロントエンドは文字列として受信
- フロントエンド側は `try { await invoke(...) } catch (e) { toast.error(String(e)) }` パターン

---

## 3. データベース

- `Mutex<Connection>` による単一 DB 接続。WAL モードで読み取り並行性を確保
- 個人アプリ規模でコネクションプールは過剰 — 追加しない
- ORM（Diesel / SQLx / SeaORM）は不使用。rusqlite + 生 SQL が意図的な選択
- マイグレーション SQL は `include_str!` でバイナリに埋め込み（実行時の外部ファイル依存なし）
- 全 PK は UUID v7（TEXT 型）: 時刻ソート可能 + インポート時の衝突回避

---

## 4. 依存予算

**原則**: 依存は「現実の問題を解決する」ときだけ追加する。"nice to have" は追加しない。

| カテゴリ        | 判断基準                                                     |
| --------------- | ------------------------------------------------------------ |
| Rust クレート   | cargo audit で脆弱性なし + メンテ継続中 + 目的が明確         |
| npm パッケージ  | バンドルサイズ影響を確認（`pnpm build` → dist サイズ比較）   |
| UI ライブラリ   | shadcn-svelte コンポーネント優先。新規 UI lib 追加は原則禁止 |
| 外部 API / SaaS | ゼロコスト運用が破れる場合は導入禁止                         |

依存を追加する際は対応する Plan に「追加理由・代替案・サイズ影響」を明記する。

---

## 5. テスト戦略

| テスト種別          | 場所                                                 | 対象                                 |
| ------------------- | ---------------------------------------------------- | ------------------------------------ |
| Rust ユニットテスト | `src-tauri/src/**/*.rs`（`#[cfg(test)]` モジュール） | Service・Repository のロジック       |
| Vitest              | `src/lib/**/*.test.ts`                               | フロントエンド store・ユーティリティ |
| Playwright E2E      | `tests/*.spec.ts`                                    | ユーザー操作フロー（Tauri + CDP）    |

**E2E の書き方指針**:

- ハッピーパス + 代表的なエラーケース 1〜2 件を最小限でカバー
- `page.evaluate()` でプライベート状態を直接読まない（公開 API / DOM 経由で検証）
- フレークを避けるため `waitFor` / `locator` を `setTimeout` より優先

**リファクタ閾値**: 既存テストが通る限り内部実装を変えてよい。テストが壊れたらまず「テスト自体が実装詳細に依存していないか」を確認する。

---

## 6. CSS / デザインシステム

### 6.1 トークン階層

```
--ag-* (Arcagate tokens)  ←  コンポーネントはここだけ参照
    ↑ bridge
--background / --border 等 (shadcn tokens)
    ↑ map
Tailwind utility classes
```

- コンポーネントは `--ag-*` トークンを直接参照。Tailwind の色クラス（`bg-gray-900` 等）は使わない
- `src/lib/components/ui/`（shadcn scaffold）は手動編集原則禁止
  - ビルドエラー / 型エラー修正は例外（対応する L3 ドキュメントに記録）

### 6.2 テーマシステム

- 組み込みテーマ（`is_builtin = 1`）は SQL マイグレーション（`migrations/0xx_*.sql`）で定義
- テーマは CSS カスタムプロパティ（`--ag-*`）の JSON 集合 + 構造 CSS ルール（`arcagate-theme.css`）の 2 層構成
  - JSON vars: 色・余白・影の値を上書き
  - 構造 CSS: テクスチャ・backdrop-filter・特殊効果など `css_vars` で表現できないルール
- カスタムテーマはユーザーが DB 上で管理。`is_builtin = 0` のレコード
- クロスウィンドウ（メインウィンドウ ↔ パレットオーバーレイ等）でのテーマ同期は Tauri イベント経由

### 6.3 過剰設計を避ける

- 同じスタイルが 3 箇所以上で繰り返されてから抽象化を検討
- コンポーネント props の増殖（5 超えたら設計を見直す）
- 不要な JSX / Svelte ラッパー要素は作らない

---

## 7. パフォーマンス予算

| 指標                 | 目標値       |
| -------------------- | ------------ |
| Idle 時 Working Set  | 100 MB 以下  |
| ホットキー → UI 表示 | P95 2 秒以内 |
| 単体 exe サイズ      | 20 MB 以下   |

ホットパス（起動時・IPC ハンドラ・レンダリングループ）に新たなブロッキング処理を追加する場合は計測値を Plan に記載する。

---

## 8. コードスタイル

- コメントは「WHY」のみ。WHAT はコードが語る
- 関数・変数名に略語を使わない（`btn` → `button`、`cfg` → `config` 等は例外）
- 型安全: `any` / `unknown` のキャストはシステム境界（IPC 受信値）に限定
- `console.log` は開発デバッグのみ。マージ前に削除
- Rust: `clippy` の lint は全通過。`#[allow(...)]` は理由コメント付きでのみ許可
