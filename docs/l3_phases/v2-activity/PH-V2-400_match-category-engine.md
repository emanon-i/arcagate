---
id: PH-V2-400
status: planning
batch: v2-activity
type: 新機能
era: Post-v1 (v2)
parent: README.md
---

# PH-V2-400: item 照合 + カテゴリ分類エンジン

## 目的

活動追跡を「ただの追跡」で終わらせず、Arcagate の item model と相互強化させる compounding loop の
バックエンドを立てる。追跡プロセス / ウィンドウを登録 item と照合し、(1) 真の利用頻度 (2) 未登録
アプリ推薦 (3) tag による自動カテゴリ を成立させる。カテゴリ分類は AI をアプリ内に持たず、
ルールベースで **決定論的・冪等**に再計算する (REQ-20260702-007)。

## スコープ

### やること

- **match engine** (service 層): 追跡 event を item と照合する。照合キーは item 種別ごと
  (activity-store / PH-PQ-800 §match key 戦略の正本を引く):

  | item 種別 | 照合キー         | 照合相手                                    |
  | --------- | ---------------- | ------------------------------------------- |
  | `Exe`     | 実行イメージパス | 追跡プロセスの実行イメージパス (正規化)     |
  | `Url`     | ドメイン         | ブラウザアクティブタブのドメイン (候補信号) |
  | `Folder`  | パス             | 前面ウィンドウの対象パス                    |
  | `Script`  | パス             | 実行スクリプトのパス                        |
  | `Command` | 照合困難         | 第 1 段は match 対象外                      |

  パス比較は大文字小文字 / 環境変数展開 / symlink を正規化してから (200 の取得側と同じ規則)
- **信号可用性で照合キーを段階化** (依存を正直に): 本フェーズで確実に照合できるのは **`Exe`** のみ
  (200 が取る実行イメージパスが唯一保証された照合元)。他キーは source 信号が揃った時だけ照合する:
  - `Url` = ブラウザ URL は 200 で候補据え置き (未実装)。URL 信号が格上げ実装されるまで照合対象外
  - `Folder` / `Script` = 前面ウィンドウの対象パス抽出に依存。窓信号 (200) で対象パスが取れる範囲で照合し、
    取れないアプリでは対象外 (title 推測で high 照合しない)

  → engine は「利用可能なキーで当て、無ければ当てない」設計。`Exe` 照合を必達、Url/Folder/Script は
  信号が来たら有効化される拡張点として持つ (信号不在を誤照合で埋めない)
- **照合に信頼度を保存**: 各 match に `confidence` (`high` / `medium` / `low`) と `match_reason`
  (`exe_path_exact` / `domain_exact` / `title_heuristic` 等) を持たせる。完全一致は `high`、
  タイトル推測は `low`。誤マッチを黙って集計に混ぜず、`low` は UI で「未分類 / 低信頼」として
  修正可能にする (表示は 600)
- **真の利用頻度**: match した event を item の実利用としてカウントし、既存 `launch` 由来の
  Arcagate 経由起動回数と**区別して**保持 (Arcagate 外からの起動も実利用として拾う)
- **未登録レコメンド**: 高頻度なのに未 match のアプリを抽出し、週次レビュー候補に渡す
  (利用時間 / 想定 tag = 周辺 match の tag から推定 / ワンクリック登録用データ)。即時通知はしない
- **tag 自動カテゴリ (ルールベース・冪等)**: 分類は `activity_category_rule` (matcher → category) を
  単一の真実にし、イベントへのカテゴリ付与は**集計時にルールから決定論的に再計算**する。
  カテゴリを生イベントに固定書き込みしない (ルール変更で過去分も即反映)。`apply` を何度流しても
  同結果 = 冪等。ルール投入・再適用の実行経路を service に置き、CLI (500) / 画面 (600) から使える形にする
- match した item の tag を活動カテゴリに橋渡しする経路 (item tag → category rule 生成 / 集計)
- レイヤー遵守 (`commands → services → repositories → DB`)、repository 直呼び禁止

### やらないこと

- **AI をアプリ / エンジンに組み込まない** — 分類はルールから決定論的に行う。AI が要る判断は
  未分類データを外に出して user 自身の AI にやらせ、結果を tag コマンドで受ける (500 の導線)
- **カテゴリを生イベント列に焼き込まない** — ルールから集計時解決 (冪等・再計算可能)
- CLI サブコマンドの実装は本フェーズ外 (500)。本フェーズは engine と service API まで
- **`Command` 種別の照合** — 前面プロセスとして安定観測しにくく第 1 段は対象外

## 依存

- 先行: PH-V2-050 (照合元となる窓/URL 等の取得可否・粒度を確定表から受ける) /
  PH-V2-100 (`activity_category_rule` / 集計 API) / PH-V2-200 (窓イベント + 実行イメージパス)
- 関連: `item-service` / `tag-service` (item + tag の既存モデル) / `src-tauri/src/models/item.rs` (`ItemType`)
- 後続: 500 (`activity tag` がこの engine の apply を叩く) / 600 (推薦カード・低信頼修正の UI)
- 300 とは独立 (窓イベント基盤の上で 300 と並行に進められる)

## 受け入れ条件 (機械検出)

- [ ] match engine が `Exe` を実行イメージパス正規化後に照合 (必達)。Url/Folder/Script は source 信号が
      無い間は照合対象外で、title 推測による high 照合が発生しない (誤照合を信号不在で作らない)
- [ ] 各 match が `confidence` + `match_reason` を保存し、完全一致 = `high` / タイトル推測 = `low` に
      分類される unit test が pass。1 プロセスが複数 item に当たる時は具体パス優先の順位で解決
- [ ] 真の利用頻度が `launch` 由来起動回数と区別して保持され、Arcagate 外起動を実利用として拾う
- [ ] 未登録レコメンドが「高頻度 × 未 match」アプリを抽出し、利用時間 / 想定 tag を伴う候補データを返す
- [ ] **冪等**: `activity tag apply` 相当の再計算を N 回流しても分類結果が同一 (`set` は matcher キーで
      upsert、`apply` は決定論的) の unit test が pass
- [ ] カテゴリがルールから集計時解決され、ルール変更後に過去分の集計が即座に変わる (生イベントに
      焼き込まれていない) ことをテストで確認
- [ ] item の rename / 削除に照合が追従し、古い match key が stale 化しない

## 検証方針

- 照合精度は、実 item 集合 + 実行イメージパスの合成イベントで high/medium/low の分布を検証
  (誤マッチが `low` に落ちること、完全一致が `high` になること)
- 冪等性は、同一ルール集合で apply を複数回流し diff 0 を自動テストで担保
- レコメンドは、頻度高・未登録のアプリを混ぜた fixture で抽出されることを確認

## リスク

- **誤マッチの黙殺**: 曖昧照合を high 扱いすると集計が汚れる → confidence を必須保存、low を UI 修正導線へ
- **stale match key**: item rename で照合が外れる → rename / 削除追従を要件化
- **ルールと生データの二重真実**: カテゴリを焼き込むと変更が過去に反映されない → ルール集計時解決を固定

## 横展開

- match engine の照合は item の rename / 削除に追従 (古い match key の stale 化を防ぐ)
- 正規化ポリシー (大文字小文字 / 環境変数 / symlink) を 200 の取得側と共有 (取得と照合で規則を揃える)
- `activity_category_rule` の apply 経路は 500 の `activity tag apply` と 600 の画面の両方から使われる
  単一 service にする (分類ロジックを 2 箇所に複製しない)

## 参照

- match key 戦略の正本: [`PH-PQ-800 §match key 戦略`](../paid-quality/PH-PQ-800_personal-observability.md)
- store 側: [`activity-store.md`](../../l2_foundation/features/backend/activity-store.md) (`activity_category_rule` / 冪等再計算)
- CLI 導線: [`activity-cli.md`](../../l2_foundation/features/backend/activity-cli.md) (`activity tag` / 外部 AI 駆動)
- 要件: [`vision.md`](../../l1_requirements/vision.md) REQ-20260702-007
- item: `src-tauri/src/models/item.rs` (`ItemType`) / `tag-service`
