# Arcagate エンジニアリング原則

Arcagate 固有の技術判断基準。一般的なベストプラクティスは省略する。

---

## フロント / バックエンド分担（Q-Tree）

新規コードを追加するとき、上から順に判定する:

1. OS レベルアクセス必要？ → **Rust**
2. ファイル / DB に触れる？ → **Rust**
3. 同時 100 件超処理？ → **Rust**
4. 16ms 以上 UI を止める可能性？ → **Rust**
5. アプリ再起動を跨いで状態必要？ → **Rust (DB) + フロント (表示)**
6. 上記すべて No → **フロント**

---

## IPC 境界ルール

- 要求/応答 = `invoke`、プッシュ/ストリーム = `event`
- payload **< 10KB** 目安。超えるなら分割 or file-based
- スキーマは `ts-rs` で Rust struct → TS 型を自動生成
- 1 回の invoke で > 1s 見込みなら進捗 event 分割
- バックエンド呼び出しが > 50ms 見込みなら非同期 + ローディング UI 必須
- UI 応答目標: 入力 → 視覚 fb まで **< 100ms**

---

## エラーハンドリング

**AppError 形式（IPC 境界での serialization）:**

```rust
// { code: string, message: string } として frontend に送る
// thiserror で enum、code() メソッドで文字列コードを返す
```

**禁止:**

- `let _ = result;` でエラー握り潰し
- main thread の IPC ハンドラで `unwrap()` / `expect()`
- toast に英語スタックトレース

**Arcagate 固有のパターン:**

- DB lock → 自動 3 回 + exponential backoff、最終失敗で toast
- watch 一時エラー → re-subscribe、上限で disabled 状態
- ファイル I/O 失敗 → アイテム灰色化 / 削除提案

---

## ログ標準

ログを見た agent が 1 分以内に原因・修正箇所・次アクションを特定できる水準:

```rust
tracing::error!(
    file = file!(), line = line!(),
    target_id = %item.id,
    error = %e,
    next_action = "check item.path existence",  // ← 必須フィールド
    "launchItem failed"
);
```

- ログ保存場所: `%LOCALAPPDATA%\com.arcagate.desktop\logs\Arcagate.log`
- 形式: JSON lines（jq / grep しやすい）
- 14 日 daily rotate

---

## 依存 curated list（同役割で 2 つ以上採用しない）

| 役割              | 選定                                                            |
| ----------------- | --------------------------------------------------------------- |
| フロント状態管理  | Svelte 5 runes（`$state` / `$derived`）のみ。redux/zustand 不可 |
| 日付処理          | JS 標準 `Date` / `Intl`                                         |
| UUID              | `uuid` crate v7、フロントは受け取るだけ                         |
| CSS-in-JS         | なし（Tailwind + CSS 変数のみ）                                 |
| Rust HTTP         | 原則使わない（オフライン完結）                                  |
| Rust シリアライズ | `serde` + `serde_json`                                          |
| Rust エラー       | `thiserror` + `AppError` enum（`anyhow` は使わない）            |
| ロガー            | `tracing` + `tracing-subscriber`                                |
| ORM               | 不使用（rusqlite + 生 SQL）                                     |

新規依存追加の判断基準:

1. `std` / 既存依存で足りないか（3 分で書けるなら書く）
2. 最終更新 < 12 ヶ月、週次 downloads > 10k、ライセンス OK
3. exe 20MB / idle 100MB / 起動 2 秒の 3 目標を維持できるか

---

## リファクタ発動閾値

感覚でやらない。計測でトリガ:

| 指標                  | 閾値                        |
| --------------------- | --------------------------- |
| 関数 LoC              | 50 warning / 100 refactor   |
| ファイル LoC          | 500 warning / 1000 refactor |
| Cyclomatic complexity | 10 warning / 20 refactor    |
| Fan-out               | 15 超                       |
| Duplicate code        | 5 行 × 3 箇所以上           |
| Deep nesting          | 4 レベル以上                |
| Parameter count       | 4 warning / 6 refactor      |
| Circular deps         | 存在で即 fail               |

---

## 新規機能ゲート（10 項目すべて pass）

1. スコープ外に該当しない（クラウド同期 / 他 OS / ターミナル統合 等）
2. パフォーマンス目標を悪化させない
3. UX 仕様整合（`ux-standards.md`）
4. デザインシステム整合（`--ag-*` トークン使用、shadcn 手動編集なし）
5. 依存予算通過
6. 複雑度予算通過（既存 LoC / cyclomatic を悪化させない）
7. 1〜2 Plan で収まる規模

「**なくても毎日使えるか？**」で問う。Yes なら追加しない。

---

## 設計固定枠（変えない判断）

- レイヤー: `commands → services → repositories → DB`（逆禁止）
- Service Layer が全 IPC エントリーポイントの共通経路
- Repository 間の相互参照禁止
- `Mutex<Connection>` + WAL（プールは過剰）
- UUID v7 / `include_str!` でマイグレーション埋め込み
