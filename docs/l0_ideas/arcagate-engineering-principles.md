# Arcagate エンジニアリング原則

## 1. 目的

本文書は Arcagate 開発時の **技術判断基準** を定める。Plan の受け入れ・リファクタ発動・新規機能提案・テスト設計・依存追加 等、実装に関わる判断すべてに通底する指針を集約する。

### 品質バー

> **「他人が使って・配布されて・販売されても問題ない水準」** を目指す。

個人専用のつもりで妥協せず、誰かに手渡したときに恥ずかしくない品質を常に狙う。この基準はすべての判断において最上位にある（§9 で測定可能な条件に落とす）。

GitHub public 状態で既に配布可能、将来的な販売もオプションとして開かれている。現状は開発者自身の毎日の使用を起点に磨き込み、品質バーは常に配布水準。

### 他ドキュメントとの位置関係

- `CLAUDE.md` — プロジェクト規約 / 禁止事項。本文書と矛盾しない
- `docs/dispatch-operation.md` — 運用フロー（process）。本文書は技術判断基準（technical）
- `docs/l1_requirements/vision.md` — プロダクト要件 / マイルストーン / 非機能要求。本文書は vision の制約を前提に技術判断を下す
- `docs/l1_requirements/ux_standards.md` — UX 標準（モーション / 色 / タイポ / Do&Dont）。本文書の §6 テストピラミッドで参照
- `docs/l0_ideas/arcagate-concept.md` — プロダクト概念 / 競合 / 設計思想。本文書は concept のフォーカスを保つ立場
- `docs/dispatch-log.md` — 実行ログ。本文書の違反・例外は log に記録

---

## 2. フロント / バックエンド分担の決定基準

### 原則

| 処理種別                                               | フロント（Svelte / TS） | バックエンド（Rust） |
| ------------------------------------------------------ | ----------------------- | -------------------- |
| UI レンダリング・状態管理                              | ✅                      | —                    |
| ユーザ入力（クリック・キーボード・D&D）                | ✅                      | —                    |
| 軽量データ変換（整形・並び替え・フィルタ、~100 件）    | ✅                      | —                    |
| CSS 変数適用（テーマ切替）                             | ✅                      | —                    |
| 即時レスポンスの軽量ロジック（debounce 内の計算等）    | ✅                      | —                    |
| ファイルシステム I/O（watch / scan / read / write）    | —                       | ✅                   |
| SQLite クエリ（`Mutex<Connection>` 単一接続）          | —                       | ✅                   |
| プロセス起動（launchItem）                             | —                       | ✅                   |
| 大量データ変換（>100 件 or >16ms 想定）                | —                       | ✅                   |
| 長時間 / ストリーミング処理                            | —                       | ✅                   |
| ネイティブ OS 統合（global hotkey / tray / autostart） | —                       | ✅                   |
| ファイルフォーマット解析（exe アイコン抽出等）         | —                       | ✅                   |
| スケジュール / 起動時タスク                            | —                       | ✅                   |

### グレーゾーン判断フロー（新規コード追加時）

```
Q1: OS レベルのアクセスが必要か？ → Yes なら Rust
Q2: ファイル / DB に触れるか？ → Yes なら Rust
Q3: 同時に 100 件超を処理するか？ → Yes なら Rust
Q4: 16ms 以上 UI を止める可能性があるか？ → Yes なら Rust
Q5: アプリ再起動を跨いで状態が必要か？ → Rust (DB) + フロント (表示)
上記全部 No → フロント
```

### IPC 境界の設計原則

- 要求 / 応答は `invoke`、プッシュ / ストリームは `event`
- payload / 戻り値は小さく、スキーマを Rust struct ↔ TS interface で同期（候補: `ts-rs` で自動生成）
- エラーは境界で `AppError` に統一、フロント側は toast に整形
- 重い処理を 1 回の invoke でやらない（>1s 見込みなら進捗 event で分割）

### 具体的数値（目安、超過は実装の異常サイン）

- UI 応答目標: ユーザ入力から視覚フィードバックまで **< 100ms**（16ms × 6 frames ≒ 知覚可能境界）
- バックエンド呼び出しの見込み時間が **> 50ms** なら非同期 + ローディング UI 必須
- IPC payload は **< 10KB** 目安、超える場合は分割 or file-based

### 実績ベース検証（batch-63 計測済み）

#### 現状の `cmd_*` コマンド一覧（batch-59 frontend-backend-split.md より）

| カテゴリ     | コマンド数 | 主要コマンド                                            |
| ------------ | ---------- | ------------------------------------------------------- |
| items        | ~15        | cmd_create/update/delete/list_items, cmd_toggle_star 等 |
| workspace    | ~12        | cmd_create/update/delete_workspace, cmd_add_widget 等   |
| theme        | ~8         | cmd_save/load_theme, cmd_import/export_theme 等         |
| config       | ~5         | cmd_save/load_config, cmd_mark_setup_complete 等        |
| watched_path | ~4         | cmd_add/remove/list_watched_paths 等                    |
| launch       | ~2         | cmd_launch_item, cmd_open_url 等                        |

#### フロント側で重くなっている処理

現時点で判明している重い処理: **特になし**。

- フィルタ・ソートは `WidgetItemList` でフロント側実行だが、現状アイテム数は少ない
- `cmd_extract_item_icon` は同期 IPC（監視継続、C-2 参照）

#### 移譲候補の具体リスト

**現時点で移譲候補なし。** フロント側の ~100 件超過ケースは発生していない。
アイテム数が増加した場合は `cmd_list_items` の paging を検討（REQ 段階）。

---

## 3. エラーハンドリング標準

### エラー種別 × 対応方針

| エラー種別        | 発生源                      | ユーザ通知                 | ログ       | リトライ                        | フォールバック                  |
| ----------------- | --------------------------- | -------------------------- | ---------- | ------------------------------- | ------------------------------- |
| IPC 呼び出し失敗  | invoke → Rust Err           | Toast（短文）              | warn       | なし                            | UI は元の状態維持               |
| DB lock / busy    | `Mutex<Connection>` 競合    | なし（内部）               | debug/warn | 自動 3 回 + exponential backoff | 最終失敗で error toast          |
| DB 制約違反       | UNIQUE / FK / NOT NULL      | Toast（文脈）              | warn       | なし                            | 入力やり直し                    |
| ファイル I/O      | launchItem / watch / export | Toast（平易）              | warn       | なし                            | アイテム灰色化 or 削除提案      |
| watch 一時エラー  | fs_watcher                  | なし（内部）               | warn       | 自動 re-subscribe               | 上限で warn log + disabled 状態 |
| 入力 validation   | ItemForm / Settings         | インライン（赤枠 + hint）  | trace      | なし                            | 修正まで保存不可                |
| Rust panic        | unwrap / expect             | Toast（一般メッセージ）    | error      | なし                            | アプリは生存させる              |
| フロント JS error | Svelte / Promise reject     | dev: console / prod: toast | error      | なし                            | 局所に封じ込める                |

### 原則

1. **静かに失敗しない**: `let _ = result;` 禁止、ログに残すかユーザに通知
2. **AppError に統一**（Rust）: `thiserror` で enum、`From` で変換自動化、IPC 境界で `{ code, message, details? }` にシリアライズ
3. **境界 serializable**: Rust の詳細 error を TS がパニックせずに受け取れる shape
4. **ユーザ通知は要点のみ**: Toast は短文、スタックトレースは見せない
5. **リトライは冪等 / 副作用非重複の場合のみ**自動化、それ以外はユーザ判断

### 禁止

- `let _ = result;` でエラー握り潰し
- main thread request 処理で `unwrap()` / `expect()`
- Toast に英語スタックトレース
- エラーを state に残したまま UI に滞留

### 推奨パターン

- Rust: `Result<T, AppError>` + `?` 伝播 + 境界で `AppError::serialize()`
- TS: `try { await invoke(...) } catch (e) { toast.error(parseAppError(e).message) }` を共通 helper に寄せる
- 一時エラー retry: backoff + 「リトライ中」UI
- undo は基本なし、失敗時は状態説明 + ユーザやり直し

---

## 4. 可観測性（ログ）標準

### 原則: 「ログを見た agent が 1 分以内に原因 / 修正箇所 / 次アクションを特定できる」

ログ 1 行に最低限:

- **どこで**: ファイルパス + 行番号 + 関数名 or span 名
- **何が**: イベント名 + 関連データ（ID、入力値、期待値 vs 実際値）
- **なぜ**（分かる範囲で）: 既知エラーパターン or 原因候補
- **次に何を**: agent / 人間向け next_action（修正箇所ヒント or 参照ドキュメント）

### Rust 側: `tracing` ベース

```rust
// 悪い例
tracing::error!("failed to launch");

// 良い例
tracing::error!(
    file = file!(),
    line = line!(),
    target_id = %item.id,
    target_path = %item.path,
    kind = ?item.kind,
    error = %e,
    next_action = "check item.path existence; if valid, inspect spawn command assembly in launch.rs",
    "launchItem failed: target path may not exist or permission denied"
);
```

**規約**:

- `#[tracing::instrument]` で function span 自動付与
- structured fields で ID・パス・状態を必ず添える
- error log には `next_action` field 必須（agent 読み前提）
- span 名は `<module>::<function>` で階層を辿れる
- `AppError::to_tracing_fields()` で統一展開

### フロント側: `console.*` ラッパー

共通 helper `src/lib/log.ts`:

```typescript
// 悪い例
console.error('failed to save theme', err);

// 良い例
logError('themeStore.saveTheme', {
  file: 'src/lib/state/theme.svelte.ts',
  line: 142,
  event: 'theme_save_failed',
  themeId: theme.id,
  error: err,
  nextAction: 'inspect invoke("save_theme") payload; check Rust side cmd_save_theme in theme.rs',
});
```

- 本番ビルドでは `cmd_log_frontend` 経由で Rust 側に転送、error / warn レベルを永続化
- dev ビルドでは `console` のみ

### ログレベル使い分け

| level   | 使いどころ                                         |
| ------- | -------------------------------------------------- |
| `trace` | 関数の出入り、hot path ステップ（通常 off）        |
| `debug` | 開発中の状態遷移、DB ロック取得・解放              |
| `info`  | ユーザ視点で意味あるイベント（起動成功、設定変更） |
| `warn`  | 一時失敗、retry、既知の非致命                      |
| `error` | 業務不能、ユーザ体験損失                           |

### 永続化ログ

- **場所**: `%APPDATA%/arcagate/logs/arcagate-YYYY-MM-DD.log`
- **フォーマット**: JSON lines（agent が jq / grep しやすい）
- **保持**: 14 日 daily rotate
- **sink**: Rust tracing は `tracing-subscriber::fmt::json`、フロント event も Rust 側で同じファイルに吐く

### agent 向け運用

- エラー調査の第一手はこのログ（`/simplify` や修正時に grep / jq で最新 error/warn を見る）
- Plan 実装中のエラーは `next_action` を実行 → 不足なら span / stack で辿る
- 再発しそうなエラーは lessons.md に 1 行追記

### 既存コードへの段階的導入

- 新規コミット以降はこの標準に沿う
- 既存ログは整理系バッチで段階的アップグレード
- 初回は `src-tauri/src/commands/` の `cmd_*` から着手

---

## 5. 依存予算

### 上位制約（vision.md からの目標）

- 単体 exe（Tauri バンドル含む）: **20MB 以下**
- Idle メモリ: **100MB 以下**
- 起動 P95: **2 秒以内**

これを超える依存追加は根本的に不可。この 3 制約からバンドルサイズを逆算。

### 計測ツール（アーキテクチャ棚卸しフェーズで初回計測 → ベースライン化）

| 対象                  | ツール                                 | 出力                  |
| --------------------- | -------------------------------------- | --------------------- |
| フロントバンドル      | `vite-bundle-visualizer`               | treemap               |
| 依存ごとの寄与        | `rollup-plugin-visualizer`             | treemap               |
| Rust バイナリ全体     | `ls -la` + `cargo bloat --release`     | サイズ + クレート寄与 |
| Rust 重量クレート     | `cargo bloat --release --crates -n 30` | top 30                |
| フロント未使用 export | `knip`                                 | 削除候補              |
| Rust 未使用 dep       | `cargo-udeps`                          | 削除候補              |
| 起動時間              | `performance.now()` + Rust 起動ログ    | ms                    |

ベースライン化後、「これより増やさない」運用。vision 目標を超えなければ OK の判定。

### システム的検知（自動化対象）

| 検知したい現象                           | ツール                                                         |
| ---------------------------------------- | -------------------------------------------------------------- |
| **重複版**（同パッケージの異バージョン） | npm: `pnpm ls` + `syncpack` / cargo: `cargo tree --duplicates` |
| **未使用パッケージ**                     | npm: `knip` or `depcheck` / cargo: `cargo-udeps`               |
| **セキュリティ脆弱 / ライセンス違反**    | npm: `pnpm audit` / cargo: `cargo-deny`                        |
| **同役割の複数ライブラリ**               | カスタムチェッカ（下記 curated list）                          |
| **アーキ違反な import（layer 越境）**    | `dependency-cruiser` rules                                     |
| **直接 import 禁止（deprecated）**       | `dependency-cruiser` / ESLint `no-restricted-imports`          |
| **バンドル急増 / バイナリ肥大**          | `vite-bundle-visualizer` / `cargo-bloat` 定期実行              |

### 同役割ライブラリの curated list（source of truth）

1 つの役割に対し採用するのは 1 ライブラリまで。該当役割で 2 つ以上検出したら CI で警告 or fail。

| 役割                          | 採用可 / 候補                              | 備考                                                        |
| ----------------------------- | ------------------------------------------ | ----------------------------------------------------------- |
| 日付処理                      | なし（JS 標準 `Date` / `Intl` で足りる）   | 外部 date lib 追加は要議論                                  |
| 状態管理（フロント）          | Svelte 5 runes（`$state`, `$derived`）のみ | redux / zustand / jotai 等は不可                            |
| HTTP クライアント（フロント） | なし（オフライン完結設計）                 | axios / ky / got 等は不可                                   |
| UUID                          | `uuid` crate の v7                         | Rust 側で生成、フロントは受け取るだけ。他バージョン混在不可 |
| CSS-in-JS                     | なし（Tailwind + CSS 変数）                | styled-components / emotion 等は不可                        |
| 状態管理（バックエンド）      | `Mutex<Connection>` + SQLite               | ORM 禁止（CLAUDE.md）                                       |

Rust 側（追加のガード）:

| 役割              | 採用可 / 候補                                      |
| ----------------- | -------------------------------------------------- |
| HTTP クライアント | 原則使わない（オフライン完結）、必要時は `reqwest` |
| シリアライズ      | `serde` + `serde_json`、他は不可                   |
| エラー            | `thiserror` + `AppError` enum、`anyhow` は使わない |
| 非同期ランタイム  | `tokio`（Tauri が内包）、他不可                    |
| ロガー            | `tracing` + `tracing-subscriber`、他不可           |

### CI / 自動化

| チェック                      | 実行場所                       | 違反時                                   |
| ----------------------------- | ------------------------------ | ---------------------------------------- |
| 重複版 / 未使用 / 同役割      | `pnpm run audit:deps`（PR CI） | fail                                     |
| ライセンス / 脆弱性           | `pnpm audit` + `cargo-deny`    | fail                                     |
| アーキ違反 import             | `dependency-cruiser`（PR CI）  | fail                                     |
| バンドル / バイナリサイズ変動 | 月 1 回 scheduled workflow     | 5% 超増加で warning + 整理系バッチに積む |

### 新規依存追加の判断フロー

1. `std` / 既存依存で足りないか（3 分で書けるなら書く）
2. 最終更新 < 12 ヶ月、週次 downloads > 10k、ライセンス OK
3. 同役割の既存依存がないか（上記 curated list）
4. 追加して計測 → exe 20MB / idle 100MB / 起動 2 秒の 3 目標維持できるか
5. ベースラインを超えそうなら、軽量代替 or Rust 側実装 or 自前実装

### 実装

- `scripts/audit/check-dep-roles.ts` で上記 curated list を source of truth として参照
- `pnpm run audit:deps` で一括実行、CI 必須
- 棚卸しフェーズ中のバッチで整理系 1 本として実装

---

## 6. テストピラミッド（観点主導、業界体系ベース）

### 原則: 「観点を言語化 → それに沿って書く」、カバレッジ % は後追い指標

- 業界確立の観点体系を借りる（SFDIPOT / HICCUPPS）
- 機械探索で人間の思いつかない入力を攻める（Property-based Testing）
- カバレッジ % は観点漏れの検出器、数値を目的化しない

### Layer 1: SFDIPOT（機能設計時の 7 観点）

| 観点             | 問い                                  |
| ---------------- | ------------------------------------- |
| **S** Structure  | コードはどこ？ 内部構造は？           |
| **F** Function   | 入出力は？ 主要変換は？               |
| **D** Data       | 型 / 範囲 / encoding / 欠損時は？     |
| **I** Interface  | 呼び元 / 呼び先 / IPC 境界は？        |
| **P** Platform   | OS / WebView2 / デバイス固有挙動は？  |
| **O** Operations | 正しい使い方 / 誤操作は？             |
| **T** Time       | 遅い / 速い / タイムゾーン / 期限は？ |

**運用**: Plan 文書に `## テスト観点（SFDIPOT）` 節必須。7 観点考慮し、重要観点 3 つ以上をテスト化。

### Layer 2: HICCUPPS（受け入れ判定オラクル）

| オラクル                           | 問い                         |
| ---------------------------------- | ---------------------------- |
| **H** History                      | 過去挙動と一致               |
| **I** Image                        | 業界 / 競合標準と一致        |
| **C** Comparable products          | 類似機能と比較して妥当       |
| **C** Claims                       | ドキュメント / UI 主張と一致 |
| **U** User expectations            | ユーザ期待と合致             |
| **P** Product internal consistency | 製品内他機能と一貫           |
| **P** Purpose                      | 機能意図通り                 |
| **S** Statutes                     | 法規 / ライセンス            |

**運用**: Plan 文書の「受け入れ条件」各項目に該当オラクルタグ（例: `[Function, User]`）。主観 UX オラクル（User / Image）は手動確認依頼セクション運用。

### Layer 3: Property-based Testing

人間の観点が言語化できない領域をランダム生成で探索:

- **TS**: `fast-check` + vitest
- **Rust**: `proptest` + cargo test

**向く対象**: パーサ / バリデータ / ソート・フィルタ・マージ（invariant 検証）/ IPC payload round-trip / テーマ JSON round-trip / UUID / タイムスタンプ

**書き方例**:

```typescript
import { fc } from 'fast-check';

it('theme JSON round-trip preserves variables', () => {
  fc.assert(fc.property(
    fc.record({ /* 任意の --ag-* 変数 */ }),
    (vars) => {
      const json = exportTheme(vars);
      const parsed = importTheme(json);
      expect(parsed).toEqual(vars);
    }
  ));
});
```

**導入時期**: アーキテクチャ棚卸しフェーズで整理系 1 本、初回 3〜5 箇所に適用。以降新規の決定論的関数に追加。

### ピラミッド構造

```
   /\   E2E (Playwright CDP)
  /  \  - Platform / Operations 観点、ユーザストーリー
 /    \
/------\
 /\    Integration（vitest happy-dom / Rust in-memory SQLite）
/  \   - Interface / Structure 観点
/----\
 /\   Unit（vitest + cargo test + property-based）
/  \  - Function / Data 観点、機械で入力空間探索
/----\
```

### カバレッジ補助指標

- Unit 分岐 70% 目安（下回ったら SFDIPOT 観点漏れ疑い）
- Integration: 主要 Store / `cmd_*` 全関数に 1 ケース以上
- E2E: `@smoke` 20 シナリオ以下、`@nightly` 制限なし

カバレッジは観点漏れ検出器、数値目的化しない。

### E2E 固有の原則

- 実機と同じ経路（pointer chain / dragTo native drag、synthetic 禁止）
- `afterEach` で `mouse.up` / `keyboard.up`（入力キャプチャ残留防止）
- `globalTimeout: 300s`
- CDP 経由で WebView2 実接続

### 「直った」の判定（3 点揃い）

- E2E 緑
- agent 自身の CDP 経由実機確認
- SFDIPOT 重要観点を潰した

主観 UX（User / Image オラクル）は手動確認依頼セクション運用。

---

## 7. リファクタ発動条件

### 原則: 「計測でトリガ、感覚でやらない」

各指標に閾値を決めて、超えたら整理系バッチで拾う。超過しても「意味ある凝集」で説明できるなら残して OK、例外は lessons.md に記録。

### 自動検知トリガ（計測して閾値判定）

| 指標                  | 閾値                         | 計測ツール                                           | 違反時アクション                 |
| --------------------- | ---------------------------- | ---------------------------------------------------- | -------------------------------- |
| 関数 LoC              | 50 warning / 100 refactor    | eslint / complexity-report / clippy::too_many_lines  | 関数分割、純粋関数抽出           |
| ファイル LoC          | 500 warning / 1000 refactor  | cloc / tokei                                         | コンポーネント分割、責務分離     |
| Cyclomatic complexity | 10 warning / 20 refactor     | eslint-plugin-sonarjs / clippy::cognitive_complexity | 早期 return、分岐抽出            |
| Fan-out               | 15 超 warning                | madge / cargo depgraph                               | 責務過多の疑い、分離             |
| Fan-in                | 20 超 warning                | 同上                                                 | ホットスポット、ファサード化検討 |
| Duplicate code        | 5 行以上 × 3 箇所以上        | jscpd / 目視                                         | 共通関数 / utility 抽出          |
| Deep nesting          | 4 レベル以上                 | eslint-plugin-sonarjs / clippy                       | 早期 return、関数抽出            |
| Parameter count       | 4 warning / 6 refactor       | clippy::too_many_arguments                           | options object / struct 化       |
| Magic number / string | リテラル直書き               | eslint-plugin-unicorn / clippy::approx_constant      | 名前付き定数化                   |
| Circular deps         | 存在で即 fail                | madge --circular / cargo depgraph                    | 境界再設計                       |
| Dead code             | 未使用 export / fn           | knip / cargo-udeps / `#[warn(dead_code)]`            | 削除                             |
| LCOM（凝集度）        | 棚卸し後ベースラインから決定 | 棚卸しフェーズで選定                                 | クラス / モジュール分割          |
| CBO（結合度）         | 同上                         | 同上                                                 | 依存削減                         |

### 人間判断トリガ

| パターン           | 兆候                                                      |
| ------------------ | --------------------------------------------------------- |
| SRP 違反           | 1 つの module / component に「と」で繋がる複数関心事      |
| 抽象化しすぎ       | 使われない generic、過剰 interface、2 段以上の wrapper    |
| 抽象化が薄い       | 同じロジックが複数箇所、変更時 N 箇所直す                 |
| Test smells        | flaky / slow / 依存強い / setup 肥大 / assertion roulette |
| Boy scout 違反     | 既存コード周辺を放置したまま通り過ぎる                    |
| 負債可視化         | `// TODO` / `// FIXME` 増、期限切れ                       |
| レビュー反復違和感 | `/simplify` で同種指摘が複数バッチで出る                  |

### 実行

- 各バッチの整理系 1 本で上記トリガから 1〜3 件拾う
- 規模大きいものは独立整理バッチ（5 Plan 全部整理、も許容）
- Before / After で指標改善を PR 本文に記録
- 既存機能を壊さない（テスト緑維持、破壊的 API 変更は別 Plan）

### 棚卸しフェーズで確定すること

- 現在のベースライン数値
- LCOM / CBO の実際の閾値
- 閾値超過 top 10 を `docs/l2_architecture/refactoring-opportunities.md` に積む

### 参考

Martin Fowler "Refactoring" 2nd ed. のコードスメル辞書 + リファクタ手順カタログ。

---

## 8. 新規機能提案ゲート

### 原則: 「やらないことを決める」

Arcagate のフォーカスを保つため、新機能は以下 10 ゲートを全 Pass した上で Plan 化。

### 必須ゲート

| ゲート                      | 判定基準                                                                                                                                                                      |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **G1 凍結領域**             | vision.md の凍結対象（REQ-012 コンテキストメニュー統合、REQ-013 ファイルマネージャー・AI 連携深化 等）に該当しない。該当するなら凍結解除議論を経てから再提案                  |
| **G2 スコープ外**           | vision.md §2.2「スコープ外」（クラウド同期 / Linux・macOS ネイティブ / ターミナル統合 等）に該当しない。理由は「プロダクトフォーカスを保つため」。公開方針 / 配布可否とは独立 |
| **G3 マイルストーン整合**   | M1〜M2c のいずれかに属する、または妥当な延長として説明できる                                                                                                                  |
| **G4 パフォーマンス**       | exe 20MB / idle 100MB / 起動 P95 2 秒 を悪化させない。悪化見込みなら計測で確認                                                                                                |
| **G5 UX 原則整合**          | ux_standards.md の Do/Don't、状態定義（hover/focus/active/disabled）、a11y（Reduced Motion / focus ring / キーボード操作）を満たす                                            |
| **G6 デザインシステム整合** | `--ag-*` トークン使用、shadcn 手動編集なし、テーマ切替で崩れない                                                                                                              |
| **G7 依存予算**             | §5 の判断フロー通過、curated list 整合                                                                                                                                        |
| **G8 複雑度予算**           | 既存コードの cyclomatic / LoC / nesting を悪化させない。増えるなら同時に整理 Plan を付ける                                                                                    |
| **G9 テスト観点**           | SFDIPOT で観点列挙可、HICCUPPS で受け入れ判定可、自動テスト可能範囲が明確                                                                                                     |
| **G10 コスト妥当性**        | 1〜2 Plan で収まる規模。大規模なら段階分解                                                                                                                                    |

### 判定フロー

```
新機能アイデア
  → 10 ゲート全 Pass?
     → Yes: Plan 化可、Plan 冒頭に「全 Pass 確認済み」を記載
     → No:  dispatch-log「却下機能リスト」に却下理由と再提案条件を記録
```

### スコープ拡大の誘惑への構え

Arcagate の価値は「起動の摩擦をゼロ」「毎日使える」に集中。他ツールの機能を真似て追加するより、**既存機能の磨き込み** を優先（UX/一貫性/安定性ポリッシュ原則）。

「**なくても毎日使えるか？**」を問う。Yes なら追加しない。

### 却下後の扱い

dispatch-log.md の「却下機能リスト」に残す。条件（凍結解除、マイルストーン変更、品質バー引き上げ等）が変わったら再提案可能。

---

## 9. 「毎日使える」のオペレーショナル定義

### 品質バー（§1 再掲）

**「他人が使って・配布されて・販売されても問題ない水準」**

ユーザ本人だけでなく、**誰が使っても毎日使える** を測定可能な条件に落とす。

### 主観オラクル → 客観指標の対応（業界標準 + Arcagate 目標）

batch-91 PH-410 で取得した業界標準（Raycast / Alfred / Spotlight / Material Design 3）を競合列に統合。

| 主観観点               | 客観指標                                 | Arcagate 閾値                                         | 業界標準（出典）                                        |
| ---------------------- | ---------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------- |
| 起動が速い             | ホットキー → パレット表示 P95            | 2 秒以内（vision.md）/ **未計測**                     | Raycast/Alfred ≤ 100ms、Spotlight ≤ 200ms（要計測）     |
| 検索体感               | 入力 → 結果反映 P95                      | 150ms debounce + 即時反映 / **未計測**                | Raycast < 50ms、VS Code Command Palette < 30ms          |
| アニメ知覚             | UI 遷移 duration                         | 120/200ms（ux_standards.md）                          | Material Design 3 emphasized 200-300ms（短い側で OK）   |
| 気持ちよく動く         | モーション違反（ease / duration 外れ）   | ux_standards.md 違反ゼロ / **svelte-check 常時監視**  | —                                                       |
| ストレスがない         | エラートースト発生率（7 日連続使用）     | **未計測**（ログ永続化後にベースライン設定）          | —                                                       |
| 壊れない               | クラッシュ率（起動 100 回あたり）        | 0 件目標 / **未計測**（ログ活用予定）                 | Raycast/Alfred 商用 SLA 0.1% 未満を目安                 |
| わかる                 | 初回起動〜最初のアイテム登録までの手数   | 3 操作以内 / **未検証**（M2 前に確認）                | Nielsen H6 認識 vs 想起 — onboarding hint 必須          |
| 見やすい               | WCAG コントラスト比                      | AA 以上（ux_standards.md §3）/ **未自動化**           | WCAG 2.1 AA = 4.5:1 (text), 3:1 (UI)                    |
| 慣れる                 | キーボード完結率（マウスなしでコア操作） | パレット・Library 検索・起動で 100% / **手動確認**    | Raycast/Alfred はキーボード完結が標準                   |
| 配布サイズ             | exe 容量                                 | 16.5MB（実測）/ vision 目標 20MB 以下                 | Raycast (macOS) ~80MB / Playnite ~50MB → 競合より小さい |
| Idle メモリ            | 通常起動時 RAM                           | **未計測** / vision 目標 100MB 以下                   | Raycast ~100MB / Alfred ~70MB                           |
| 他人に渡しても困らない | README + 初回セットアップ完走            | 第三者レビュー通過 / **M2 リリース前**                | —                                                       |
| 長く使える             | CI 緑継続 / regression 発生              | 30 日以上緑、regression 月 1 件以下 / **CI 緑維持中** | —                                                       |

### 運用

- 数値はアーキテクチャ棚卸しフェーズでベースライン計測、以降 PR 受け入れ条件に反映
- 各 PR で「配布水準を保っているか」を自問（品質バーは日々の品質ゲート）
- 手動確認依頼セクションの主観チェックもこの定義を頼りに判定
- 未計測の指標は「計測する Plan」を棚卸しフェーズ内で立てる

### 違反検知

- 閾値違反が発生したら即座に整理系バッチ or hotfix で対処
- 繰り返し違反は lessons.md に登録、Plan テンプレにチェック追加

### Heuristic Evaluation + Cognitive Walkthrough 適用方針（batch-91 PH-411 統合）

- 新機能 Plan は **Nielsen 10 Heuristics** に対して 3 観点以上を明示（受け入れ条件に紐付け）
- ユースケース型変更は **Cognitive Walkthrough 4 Steps**（目標 / 手段認知 / 操作可能性 / フィードバック）でステップ毎に確認
- 1 機能あたり最低 1 回の HE+CW を batch-92 以降で実施し severity 0-4 で記録（`docs/l2_architecture/use-case-friction.md` に蓄積）
- Codex セカンドオピニオン（Rule C）は macro 判定 + 残作業優先順位の確認に使う（batch-91 PH-413 で運用確立）

参照: `docs/l1_requirements/ux-research/industry-standards.md` / `cedec-papers.md` / `codex-review.md`

---

## 10. 参照リンク

### プロダクト基盤

- `docs/l0_ideas/arcagate-concept.md` — プロダクト概念・競合・設計思想
- `docs/l0_ideas/arcagate-visual-language.md` — ビジュアル言語・参照
- `docs/l1_requirements/vision.md` — 要件・マイルストーン・非機能要求
- `docs/l1_requirements/ux_design_vision.md` — UX デザインビジョン
- `docs/l1_requirements/ux_standards.md` — UX 標準（モーション / 色 / タイポ / Do&Dont）
- `docs/l1_requirements/design_system_architecture.md` — デザインシステム拡張設計
- `docs/l1_requirements/ux-research/industry-standards.md` — Nielsen 10 / HIG / Material 3 / Raycast / Spotlight / Playnite 業界標準（batch-91 PH-410）
- `docs/l1_requirements/ux-research/cedec-papers.md` — HE / CW 手法 + GDC / CHI 学術知見（batch-91 PH-411）
- `docs/l1_requirements/ux-research/claude-skills-survey.md` — Claude Code skill marketplace 探査（batch-91 PH-412）
- `docs/l1_requirements/ux-research/codex-review.md` — Codex セカンドオピニオン（Rule C 運用例、batch-91 PH-413）
- `docs/l2_architecture/` — アーキテクチャ棚卸し成果物（post-batch-62）
- `docs/l2_architecture/use-case-friction.md` — ユースケース別 friction audit（batch-90、信頼度 2/5）

### 運用 / 規約

- `CLAUDE.md` — プロジェクト規約・禁止事項
- `docs/dispatch-operation.md` — 運用フロー canonical
- `docs/dispatch-log.md` — 実行ログ
- `docs/lessons.md` — 過去の失敗パターン・教訓

### 業界標準・参考

- **SFDIPOT / HICCUPPS** — James Bach, Rapid Software Testing Heuristics
- **ISO 25010** — ソフトウェア品質モデル
- **Martin Fowler, "Refactoring" 2nd ed.** — コードスメル・リファクタ手順
- **fast-check / proptest** — Property-based testing ライブラリ

---

**END OF DOCUMENT**
