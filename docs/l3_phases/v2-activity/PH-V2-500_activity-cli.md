---
id: PH-V2-500
status: planning
batch: v2-activity
type: 新機能
era: Post-v1 (v2)
parent: README.md
---

# PH-V2-500: Activity CLI 拡張

## 目的

芯の両輪の一方 — 「自分のデータへの自由アクセス」を CLI に開く。既存 `arcagate_cli` に activity
サブコマンド群を足し、活動ログを query / 抽出 / export / 分類できるようにする。期間サマリ Markdown を
テンプレート機構で「1 押しで数秒」に出せ、貼り先は user の任意。分類は外部 AI 駆動の導線にする
(REQ-20260702-006 / 007)。

## スコープ

### やること

- 既存 `src-tauri/src/bin/arcagate_cli.rs` (clap / `--json` / `describe` パターン) に activity
  サブコマンド群を追加 (global `--db` / `--json` 継承)。サブコマンド一覧・期間指定・filter・出力形式の
  正本は [`activity-cli.md`](../../l2_foundation/features/backend/activity-cli.md):
  `activity summary / query / files / export / template / vars / tag / describe`
- **出力形式**: md (既定・期間サマリ) / csv / json / raw の 4 形式を同格で提供。raw は retention 窓内の
  生イベント (期間全域の完全 backup ではない旨を出力に明記)
- **Markdown テンプレート機構 (default + custom)**: フォーマットは `{{変数}}` 差し込みで組み立て、
  実データでプレビュー確認できる (Obsidian Web Clipper 型)。**フォーマットはコマンドで書き換える**
  (ファイル直接編集させず CLI で完結): `template list / get / set / edit / preview`。custom は
  `config` KV に保存、default はコード埋め込み (default を消す破壊操作をさせない)
- **変数の discoverability**: `activity vars list` (使える `{{変数}}` 一覧、`--json` 可) /
  `activity vars describe <var>` (意味 + 例)。変数一覧の正典は `vars list` の出力とし、doc に二重管理しない
- **カテゴリ分類 (`activity tag`) — コマンドベース・冪等・外部 AI 駆動**: `tag list / set / rm / apply /
  untagged`。`set` は matcher キーで upsert、`apply` は 400 の engine を叩いて決定論的に再計算 (冪等)。
  `untagged --json` で未分類データを吐き、外部 AI が `tag set ...` コマンド列を生成 → 流し込み → `apply`
  の導線を成立させる (アプリ内蔵 AI を持たない)
- 既存 `describe` に倣い `activity describe` を置く (agent / skill から schema 自己記述で叩ける)

### やらないこと

- **CLI から任意コード実行の経路を作らない** — activity サブコマンドは read / export / 分類ルール編集のみ。
  収集 collector の admin 機能を CLI から呼ばない (権限分離)
- **クラウドへ送らない** — 出力はローカルファイル / stdout のみ
- **独自クエリ言語 (AQL 等) を発明しない** — flag ベース filter に絞り、複雑クエリは `--json` で外部処理
  (ActivityWatch の「振り返りに query 必須」障壁を作らない)
- **AI をアプリ / CLI に組み込まない** — 分類は決定論。AI 判断は `untagged` を外に出して外部 AI にやらせる
- **部分選択的な import をしない** — 既存 export/import の全体 merge 方針を踏襲
- 分類 engine 本体 (照合 / 再計算ロジック) は 400。CLI は 400 の service を叩く薄い層

## 依存

- 先行: PH-V2-100 (読み出し元 store) / PH-V2-400 (`activity tag apply` が叩く分類 engine)
- 関連: 既存 `arcagate_cli.rs` / `export-import.md` (既存 export と整合)
- 後続: 600 (画面の export は CLI と同じ経路・format を共有)

## 受け入れ条件 (機械検出)

- [ ] `activity summary / query / files / export / template / vars / tag / describe` が追加され、
      `--db` / `--json` を継承。期間指定 (`today`/`week`/`2026-06`/`range`) と filter (app/path/type/category) が効く
- [ ] export が md / csv / json / raw の 4 形式を出す。raw が retention 窓内である旨 (完全 backup でない) を明記
- [ ] `template list/get/set/edit/preview` が動作し、`preview` が実データを流し込んだレンダリング結果を返す。
      default テンプレートを消す破壊操作が拒否される
- [ ] `vars list` (`--json` 可) / `vars describe <var>` が使える変数と意味を返す (変数一覧の正典 = `vars list`)
- [ ] `tag set` が matcher キーで upsert、`tag apply` が 400 engine で冪等再計算 (N 回で同結果)、
      `tag untagged --json` が未分類データを機械可読で吐く
- [ ] **外部 AI 駆動の往復**: `untagged --json` → `tag set` コマンド列 → `apply` を複数回流しても安全
      (upsert + 冪等) を統合テストで確認
- [ ] `activity describe` が activity スキーマの introspection を返す (agent / skill が叩ける)
- [ ] クエリが timestamp index を使い期間で絞ってから集計する (全表スキャンしない) ことを確認

## 検証方針

- 各サブコマンドは実 DB (100 の store に 200/300/400 が書いたデータ) に対して実行し、出力を目視 + `--json` 検証
- テンプレート機構は default / custom 双方でプレビュー → summary 出力の一致を確認
- 外部 AI 導線は「untagged 吐き出し → set 列適用 → apply → 再 untagged 縮小」の往復をスクリプトで再現

## リスク

- **テンプレート機構の肥大**: 変数を無制限に増やすと maintenance 沼 → 変数正典を `vars list` に一本化、
  doc 二重管理を禁止
- **AQL 化の誘惑**: filter が足りず独自言語に走る → flag + `--json` 外部処理に固定 (spec 明示)
- **default 破壊**: custom 上書きで default を失う → default はコード埋め込み・削除不可を要件化

## 横展開

- 画面 (600) の export ボタンは本フェーズの CLI export と**同じ service 経路**を叩く (format / template を
  UI と CLI で二重実装しない)
- `activity describe` は既存 `describe` と同型 (skill / agent 連携の一貫性)
- i18n: CLI 出力は英語 / 日本語の扱いを既存 CLI に合わせる (テンプレート文言は user 定義)

## 参照

- 正本: [`activity-cli.md`](../../l2_foundation/features/backend/activity-cli.md) (サブコマンド / テンプレート / tag / 外部 AI 駆動)
- store: [`activity-store.md`](../../l2_foundation/features/backend/activity-store.md) (`activity_category_rule` / retention)
- engine: [`PH-V2-400`](./PH-V2-400_match-category-engine.md) (`tag apply` が叩く分類 engine)
- 要件: [`vision.md`](../../l1_requirements/vision.md) REQ-20260702-006 / 007
- 既存: `src-tauri/src/bin/arcagate_cli.rs` / `export-import.md`
