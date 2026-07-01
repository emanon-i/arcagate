---
id: PH-V2-000
status: planning
batch: v2-activity
type: 新機能
era: Post-v1 (v2)
parent: ../../l1_requirements/vision.md
---

# V2 パーソナル活動トラッカー — L3 プラン集

V1 launcher は「起動の瞬間」しか観測しない。V2 は「起動後の時間」— 前面窓 / 実操作 / 再生メディア /
**ファイル操作** を低負荷で記録し、統合時系列に集約して後から path 経由で振り返れるようにする。
本 plan 集は L0 (`../../l0_ideas/motivation.md`) / L1 (REQ-20260702-001〜007) / L2 (activity-recorder /
activity-store / activity-cli / activity-privilege-separation / screens/activity) で確定した spec を
実装計画に落とす。数値・仕様の正本は L1/L2 にあり、本層では再定義せず参照する。

## 権限モデル前提 (P0・裁定済)

**要求は裁定済**: user は「全ボリューム・全信号を取る / 完全ローカル」を確定済み。この要求は動かない。
一方、**それを実現する取得方式は PH-V2-050 (Phase 0) が確定する** — 下記は現行 L2 の既定であり、050 の
実測で追認 / 変更され得る (裁定済なのは「何を達成するか」、方式は「どう達成するか」で 050 が正):

- **主経路 (L2 既定・050 で追認)**: 特権 collector が USN Change Journal を全ボリューム read
  (ファイル操作フル捕捉)。admin 必須は実機で一次確定 (非 admin = `Error 5 Access denied`、
  activity-recorder.md 実機表) だが、050 で ETW 等の代替と負荷比較し最終確定する
- **fallback**: admin 拒否 / 非昇格時は ReadDirectoryChangesW + **監視フォルダ集合に縮退**した
  fallback へ自動で落ちる (full 寄りハイブリッド)
- **完全ローカル (要求・不変)**: 収集データは SQLite に閉じ、telemetry / crash 報告 / 外部送信に一切混ぜない

要求 (フル捕捉 / ローカル) はこの前提で全フェーズを進める (止めない)。方式は 050 の確定表に従う。

> **唯一 user 確認を要する分岐**: 特権 collector の昇格方式を「(a) 起動ごと / セッション単位の
> UAC 明示同意で立ち上げる helper」か「(b) install 時に昇格して常駐する Windows サービス」の
> どちらにするか。両者とも USN 全ボリューム read で機能同値、差は昇格 UX と常駐モデルのみ。
> PH-V2-300 は既定 (a) で設計を進め、(b) 採用可否のみ着手時に 1 点確認する。

## フェーズ一覧

**Phase 0 (PH-V2-050) は必須の先頭ゲート**。100–800 の全実装フェーズは Phase 0 が産出する
「実証済み取得方式 確定表」を前提に実装する — 確定していない信号方式で下流に進まない。

| ID        | フェーズ                                     | 目的 (一行)                                                              | 依存                      |
| --------- | -------------------------------------------- | ------------------------------------------------------------------------ | ------------------------- |
| PH-V2-050 | **Phase 0 — 事実検証 & 方式最適化 (ゲート)** | 各信号を実機で裏取り + 代替方式を負荷最優先で実測比較し採用方式を確定    | —                         |
| PH-V2-100 | 統合時系列ストア基盤                         | source-agnostic な統合スキーマ + retention/downsampling + session        | 050                       |
| PH-V2-200 | 非特権 recorder (窓 / 実操作 / メディア)     | admin 不要の 3 信号を低負荷収集し統合ストアへ                            | 050, 100                  |
| PH-V2-300 | 特権分離 + ファイル操作収集                  | no-exec collector で USN フル捕捉、非 admin は RDCW 縮退 fallback        | 050, 100, 200             |
| PH-V2-400 | item 照合 + カテゴリ分類エンジン             | match key で item 連携 (真の利用頻度 / 推薦 / tag カテゴリ) を決定論的に | 050, 100, 200             |
| PH-V2-500 | Activity CLI 拡張                            | query / files / export / template / vars / tag サブコマンド              | 050, 100, 400             |
| PH-V2-600 | Activity 画面 + ViewSegmentedControl         | 第 3 の主要画面 + 3 択連結セグメント、glanceable UI                      | 050, 100–500              |
| PH-V2-700 | プライバシー統制 + 低負荷/security ゲート    | opt-in / 除外 / マスク / 削除 + 非機能ゲート検証を配布水準で確定         | 050, 200, 300, 600        |
| PH-V2-800 | (第 2 段) system metric 履歴 + 原因候補      | SystemMonitor 履歴化と原因候補ビュー (v2.x 後追い可)                     | 050, 100, 200, 600; M5 後 |

## 順序・マイルストーン

serial-pr (`.claude/rules/workflow.md`)。1 PH merge → user 検収 OK → 次を開く。

| マイルストーン               | 到達フェーズ | 成立する体験                                                         |
| ---------------------------- | ------------ | -------------------------------------------------------------------- |
| **M0 取得方式確定 (ゲート)** | 050          | 各信号の実証済み取得方式が確定表として揃い、下流実装の前提が固まる   |
| **M1 基盤**                  | 100 + 200    | 非特権で窓/実操作/メディアが統合ストアに溜まる。低負荷ゲート初回計測 |
| **M2 差別化の芯**            | 300          | ファイル操作ログのフル捕捉が成立 (USN / RDCW)、権限分離が構造で立つ  |
| **M3 相互強化 + 抽出**       | 400 + 500    | item 連携・カテゴリ分類・CLI export/template/tag (両輪の CLI 側完成) |
| **M4 画面 (V2 core 完成)**   | 600          | Activity 画面が成立、3 秒到達の glanceable UI、V2 を出せるライン     |
| **M5 配布ゲート**            | 700          | プライバシー統制と低負荷/security 検証を通し配布水準                 |
| **M6 第 2 段**               | 800          | system metric 履歴・原因候補ビュー (core 完成後の後追い)             |

- **050 が全実装の先頭ゲート**。100–800 は 050 の確定表に載った採用方式で実装する。050 で L2 方式が
  変わった信号は、下流フェーズが確定表を正として追従する (未確定信号のまま実装に進まない)
- 100 → 200 → 300 が収集基盤の直列骨格。400 は 300 と独立に 200 の上で進められる (照合は窓イベント基盤)
- 500 は 400 の分類ルール実体化に依存 (`activity tag` が書く `activity_category_rule` の apply が 400)
- 600 は 100–500 のデータ経路が揃ってから。700 は横断ゲートで 600 まで見えてから最終確定
- 800 は第 2 段。プロセスカウンタ取得を recorder に相乗りさせ 700 のゲートを再計測するため、
  **M5 (700 の低負荷ゲート確定) 後**に着手する。core 出荷をブロックしない

## プライバシーは後付け禁止

活動追跡は本質的に sensitive。opt-in 既定 OFF / 除外リスト / タイトルマスク / ローカル完結は
**各フェーズの設計初期から組み込む**制約。役割分担を明確にする:

- **config substrate は収集層より先に立てる**: opt-in / 除外 / マスク の config キー (既定 OFF)・
  schema・read API を、それを enforce する 200 が自フェーズ内で既存 config-service 上に確立する
  (200 の acceptance が 700 の UI 完成を待たずに成立するよう、substrate は 200/300 に内包する)
- **enforce は収集層**: opt-in gate・除外リスト・タイトルマスクは recorder (200) / collector (300) が
  **収集時点で**適用する (保存前に除外・マスク)。表示層で後から隠すのではなく、そもそも取らない
- **700 は設定 UI + 削除 UI + 監査**: PH-V2-700 は config substrate を新設するフェーズではなく、
  除外 / マスク / 削除 / 同意の**設定 UI と削除 UI を集約**し、収集層で privacy が効いていること +
  非機能ゲート (低負荷 / no-exec / ローカル完結) を **検証**するフェーズ (substrate は 200/300 が先に持つ)

## 各 phase 共通の進め方

1. **fact 確認**: 該当 file:line を実 read、引用元 L1/L2 spec の section を明示 (`cite-guideline`)
2. **横展開 audit**: 1 file 直して終わりにしない、同 pattern を grep で sweep (`lateral-sweep`)
3. **agent 自己検証**: agent dev (CDP attach + `WEBVIEW2_USER_DATA_FOLDER` 隔離) で実機 reproduce、
   before/after を Read で目視評価 (`dom-not-fixed`)。user に dev 起動 / dump を依頼しない
4. **受け入れ条件は測定可能**: 「品質を上げる」等の抽象を禁止、「audit 0 violations」「CPU 増分 < 1%」
   「誤差 < 2%」等の数値 / 機械検出に落とす
5. **SSOT**: 数値・schema・token の正本は L1/L2 / コード。L3 は設計判断と受け入れ条件を書き、生値を再掲しない

## 参照

- L0: [`docs/l0_ideas/motivation.md`](../../l0_ideas/motivation.md)
- L1: [`docs/l1_requirements/vision.md`](../../l1_requirements/vision.md) REQ-20260702-001〜007 / §4 非機能
- L2 backend: [`activity-recorder.md`](../../l2_foundation/features/backend/activity-recorder.md) /
  [`activity-store.md`](../../l2_foundation/features/backend/activity-store.md) /
  [`activity-cli.md`](../../l2_foundation/features/backend/activity-cli.md)
- L2 cross-cutting: [`activity-privilege-separation.md`](../../l2_foundation/features/cross-cutting/activity-privilege-separation.md) /
  [`security-model.md`](../../l2_foundation/features/cross-cutting/security-model.md)
- L2 screen: [`screens/activity.md`](../../l2_foundation/screens/activity.md)
- 構想の起点 (v2 プレプラン): [`PH-PQ-800`](../paid-quality/PH-PQ-800_personal-observability.md)
- 要求収集: `scratch/v2-requirements-collection.md` (PART 2 に芯確定)
- rule: [`.claude/rules/`](../../../.claude/rules/) (backend / frontend / docs / workflow)
