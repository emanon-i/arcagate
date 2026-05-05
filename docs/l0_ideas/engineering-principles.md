# Arcagate エンジニアリング原則

判断のベース。詳細表 / 過去の計測値 / 全 cmd_* 列挙等は `docs/archive/arcagate-engineering-principles-historical.md`。

---

## <severity>critical</severity> 品質バー

> 「**他人が使って・配布されて・販売されても問題ない水準**」を狙う。

個人専用のつもりで妥協しない。配布水準が常に判定基準。
GitHub public、将来的に販売も可能性として開かれている。
日々の品質ゲートはこのバーで判断する。

非機能目標（vision.md）:

- exe 単体: **20 MB 以下** （現状 12.14 MB ✅）
- Idle メモリ: **100 MB 以下** （arcagate.exe 単体 60 MB ✅、WebView2 込み 580 MB ⚠ Tauri 標準）
- 起動 P95: **2 秒以内** （未計測）

---

## <severity>critical</severity> フロント / バックエンド分担

### Q-Tree（新規コード追加時に上から順に判定）

1. OS レベルアクセス必要？ → **Rust**
2. ファイル / DB に触れる？ → **Rust**
3. 同時 100 件超処理？ → **Rust**
4. 16ms 以上 UI を止める可能性？ → **Rust**
5. アプリ再起動を跨いで状態必要？ → **Rust (DB) + フロント (表示)**
6. 上記すべて No → **フロント**

### IPC 境界

- 要求 / 応答 = `invoke`、プッシュ / ストリーム = `event`
- payload `< 10KB` 目安、超えるなら分割 or file-based
- スキーマは `ts-rs` で Rust struct → TS 型を自動生成
- 重い処理を 1 回の invoke でやらない（>1s なら進捗 event 分割）
- バックエンド呼び出しが `> 50ms` 見込みなら非同期 + ローディング UI 必須
- UI 応答目標: 入力 → 視覚 fb まで `< 100ms`

---

## <severity>critical</severity> エラーハンドリング

### 原則

- **静かに失敗しない**: `let _ = result;` 禁止、ログまたは toast
- **AppError に統一** (Rust): `thiserror` で enum、IPC 境界で `{ code: string, message: string }` に Serialize
- 境界 serializable: フロント TS 側がパニックせずに受け取れる shape
- ユーザ通知は要点のみ（toast 短文、スタックトレース見せない）
- リトライは冪等 / 副作用非重複の場合のみ自動化

### 禁止

- `let _ = result;` でエラー握り潰し
- main thread の request 処理で `unwrap()` / `expect()`
- toast に英語スタックトレース
- エラー state を放置して UI に滞留

### よくあるパターン

- DB lock / busy → 自動 3 回 + exponential backoff、最終失敗で toast
- watch 一時エラー → re-subscribe、上限で disabled 状態
- ファイル I/O 失敗 → アイテム灰色化 / 削除提案

---

## <severity>high</severity> ログ標準（observability）

> ログを見た agent が **1 分以内** に原因 / 修正箇所 / 次アクションを特定できる

### Rust 側 (tracing)

```rust
tracing::error!(
    file = file!(), line = line!(),
    target_id = %item.id, target_path = %item.path,
    error = %e,
    next_action = "check item.path existence; inspect spawn command in launch.rs",
    "launchItem failed"
);
```

`#[tracing::instrument]` で span 自動付与。`error log` には **`next_action` field 必須**。

### 永続化

- 場所: `%LOCALAPPDATA%\com.arcagate.desktop\logs\Arcagate.log`
- 形式: JSON lines（jq / grep しやすい）
- 14 日 daily rotate

### レベル使い分け

- `trace`: 関数の出入り、hot path（通常 off）
- `debug`: 開発中の状態遷移、DB ロック取得
- `info`: ユーザ視点で意味あるイベント
- `warn`: 一時失敗、retry、既知の非致命
- `error`: 業務不能、ユーザ体験損失

---

## <severity>high</severity> 依存予算

### curated list（同役割で 2 つ以上採用しない）

- フロント状態管理: Svelte 5 runes（`$state` / `$derived`）のみ。redux/zustand/jotai 不可
- HTTP クライアント (フロント): なし（オフライン完結）
- 日付処理: JS 標準 `Date` / `Intl`
- UUID: `uuid` crate v7、フロントは受け取るだけ
- CSS-in-JS: なし（Tailwind + CSS 変数）
- Rust HTTP: 原則使わない、必要時 `reqwest`
- Rust シリアライズ: `serde` + `serde_json`
- Rust エラー: `thiserror` + `AppError` enum、`anyhow` は使わない
- ロガー: `tracing` + `tracing-subscriber`
- ORM: 不使用（rusqlite + 生 SQL）

### 新規依存追加の判断

1. `std` / 既存依存で足りないか（3 分で書けるなら書く）
2. 最終更新 < 12 ヶ月、週次 downloads > 10k、ライセンス OK
3. 同役割の既存依存と被らないか
4. exe 20MB / idle 100MB / 起動 2 秒の 3 目標を維持できるか

CI: `pnpm run audit:deps` / `cargo-deny` / `dependency-cruiser` で違反検知。

---

## <severity>high</severity> テスト観点（業界体系）

### SFDIPOT（機能設計 7 観点）

| 観点             | 問い                         |
| ---------------- | ---------------------------- |
| **S** Structure  | 内部構造は？                 |
| **F** Function   | 入出力 / 主要変換            |
| **D** Data       | 型 / 範囲 / encoding / 欠損  |
| **I** Interface  | 呼び元 / 呼び先 / IPC 境界   |
| **P** Platform   | OS / WebView2 / デバイス固有 |
| **O** Operations | 正しい使い方 / 誤操作        |
| **T** Time       | 遅い / 速い / TZ / 期限      |

Plan には「観点 3 つ以上をテスト化」を明記。

### HICCUPPS（受け入れ判定オラクル）

History / Image / Comparable products / Claims / User expectations / Product internal consistency / Purpose / Statutes。
Plan の受け入れ条件にタグ（例: `[Function, User]`）。

### Property-based Testing

- TS: `fast-check`、Rust: `proptest`
- 向く対象: パーサ / バリデータ / IPC payload round-trip / テーマ JSON round-trip

### 「直った」の判定（3 点揃い）

1. E2E 緑
2. agent CDP 経由実機確認 + screenshot Read
3. SFDIPOT 重要観点を潰した

主観 UX (User / Image オラクル) は user 検収のみ。

---

## <severity>high</severity> リファクタ発動条件

計測でトリガ、感覚でやらない:

| 指標                  | 閾値                        |
| --------------------- | --------------------------- |
| 関数 LoC              | 50 warning / 100 refactor   |
| ファイル LoC          | 500 warning / 1000 refactor |
| Cyclomatic complexity | 10 warning / 20 refactor    |
| Fan-out               | 15 超                       |
| Fan-in                | 20 超 (ホットスポット)      |
| Duplicate code        | 5 行 × 3 箇所以上           |
| Deep nesting          | 4 レベル以上                |
| Parameter count       | 4 warning / 6 refactor      |
| Circular deps         | 存在で即 fail               |

「意味ある凝集」で説明できるなら残し可、例外は lessons.md に記録。

人間判断トリガ: SRP 違反 / 抽象化しすぎ / 抽象化が薄い / Test smells / Boy scout 違反 / `// TODO` 増 / `/simplify` で同種指摘が複数バッチ。

---

## <severity>high</severity> 新規機能ゲート（10 項目すべて pass）

1. **凍結領域** に該当しない（vision.md）
2. **スコープ外** に該当しない（クラウド同期 / 他 OS / ターミナル統合 等）
3. M1〜M2c のいずれかに属する、または妥当な延長
4. パフォーマンス目標を悪化させない（必要なら計測）
5. UX 原則整合（ux_standards.md）
6. デザインシステム整合（`--ag-*` トークン使用、shadcn 手動編集なし）
7. 依存予算 通過（上 §依存予算）
8. 複雑度予算 通過（既存 LoC / cyclomatic を悪化させない）
9. テスト観点 列挙可（SFDIPOT / HICCUPPS）
10. 1〜2 Plan で収まる規模

「**なくても毎日使えるか？**」で問う。Yes なら追加しない。

却下機能は `dispatch-log.md` の「却下機能リスト」に記録。

---

## <severity>medium</severity> 「毎日使える」客観指標

| 観点                          | Arcagate 閾値       | 業界目安                             |
| ----------------------------- | ------------------- | ------------------------------------ |
| ホットキー → パレット表示 P95 | 2 秒以内 / 未計測   | Raycast/Alfred ≤ 100ms               |
| 入力 → 結果反映 P95           | 150ms debounce      | Raycast < 50ms                       |
| アニメ duration               | 120 / 200ms         | Material 3 emphasized 200-300ms      |
| WCAG コントラスト             | AA 以上（自動化未） | AA = 4.5:1 (text), 3:1 (UI)          |
| キーボード完結率              | コア操作 100%       | Raycast/Alfred 標準                  |
| exe 容量                      | 20 MB 以下          | Raycast macOS ~80MB / Playnite ~50MB |
| Idle メモリ                   | 100 MB 以下         | Raycast ~100MB / Alfred ~70MB        |
| クラッシュ率                  | 0 件目標            | 商用 SLA 0.1% 未満                   |

---

## 参照

- 製品: `docs/l1_requirements/vision.md`
- UX: `docs/l1_requirements/ux_standards.md` / `docs/desktop_ui_ux_agent_rules.md`
- 過去: `docs/archive/arcagate-engineering-principles-historical.md`
