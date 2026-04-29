# Arcagate

PC 上に散在する起動元を集約する個人用ランチャー。Tauri v2 + SvelteKit + Svelte 5 runes + Rust + SQLite。

## 哲学（最上位、判断はここから）

<critical-rule id="daily-use-test">
「**毎日使えるか？**」で全機能を判断。微妙なら削る。配布水準を常に狙う。
</critical-rule>

<critical-rule id="instant-feedback">
**設定変えたら即見た目が変わる**。遅延反映は欠陥。
</critical-rule>

<critical-rule id="dom-not-fixed">
**「DOM 存在 = 治った」 判定 禁止**。「pnpm verify pass = 治った」と書かない。**画面で目視確認**できるまで「治った」と言わない（自分で screenshot を撮って Read で読み返す）。最終判定は user dev 検収。
</critical-rule>

<critical-rule id="lateral-sweep">
**1 つの不整合を発見したら横展開で全画面 audit**。1 ファイル直して終わりにしない。同パターンが他に無いか必ず grep。
</critical-rule>

<critical-rule id="cite-guideline">
**Plan 文書化時に必ず引用元 guideline doc + section を明示**する。「自分の判断」で書いた箇所は明示マーク。`memory/design_guidelines_index.md` から該当 doc を引け。
</critical-rule>

<critical-rule id="label-content">
ラベルは **機能 / 状態 / アクション**を書く。アイコン名（「星」「三本線」「プラス」）禁止。⭐ +「お気に入り」/ ☰ +「メニュー」/ ＋ +「追加」が正。
</critical-rule>

## 設計の固定枠（変えない判断）

- レイヤー: `commands → services → repositories → DB`（逆禁止）
- Service Layer が全 IPC エントリーポイントの共通経路。Repository を直呼びしない。Repository 間の相互参照禁止
- 選択肢 1 個のメニューを挟まない。ボタン押下 = 即アクション
- `Mutex<Connection>` + WAL（プールは過剰）/ UUID v7 / `include_str!` でマイグレーション埋め込み
- `AppError` は Serialize 構造体 `{ code, message }` でフロントへ
- ORM 不使用（rusqlite + 生 SQL）

## 禁止事項

<critical-rule id="forbidden">
- `src/lib/components/ui/` 手動編集（shadcn-svelte scaffold、lint 除外済）— 例外: ビルド/型エラー修正のみ
- ORM 導入（diesel, sqlx, sea-orm）
- `status: done` の L1/L2 ドキュメント書き換え
- `--no-verify` で hook bypass
- main への force push / 直 push（PR 経由 squash merge のみ）
- 実機目視なしで完了報告
</critical-rule>

## いつ何を読むか（on-demand index）

| 状況                                            | 読む doc                                                                    |
| ----------------------------------------------- | --------------------------------------------------------------------------- |
| バッチ着手 / 進行ルール                         | `docs/dispatch-operation.md`                                                |
| 設計判断 / FE-BE 分担 / エラー方針 / テスト観点 | `docs/l0_ideas/arcagate-engineering-principles.md`                          |
| UI / 視覚 / レイアウト                          | `docs/l1_requirements/ux_standards.md`、`docs/desktop_ui_ux_agent_rules.md` |
| テーマ / トークン                               | `docs/l1_requirements/design_system_architecture.md`                        |
| 製品方針 / マイルストーン                       | `docs/l1_requirements/vision.md`                                            |
| 過去の失敗 / 再発防止                           | `docs/lessons.md`                                                           |
| ガイドライン doc 全体地図                       | `memory/design_guidelines_index.md`                                         |
| 古い retrospective / 達成済 plan                | `docs/l3_phases/archive/`、`docs/archive/`                                  |

## 開発ルーチン

- `pnpm verify` — biome / dprint / clippy / rustfmt / svelte-check / cargo test / vitest（全段 pass が前提）
- `pnpm tauri dev` — 開発起動。CDP 経由で agent も操作する場合 `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9515` を付ける
- `pnpm test:e2e` — Playwright E2E（user 許可制、§4c 安全ルール）
- lefthook = staged ファイルのみ。CI が真の品質ゲート

## agent 運用

<critical-rule id="ops">
**モデル使い分け**: 軽作業（grep / lint / format / verify / 単純 fix）= Sonnet、設計判断 / 多面的解析 = Opus。`/model opusplan` で自動切替。

**sub-agent 並列**: 独立 task（screenshot 撮影 / fact 確認 / grep audit）は Task tool で sub-agent に分離して context を隔離。

**Codex 二次活用**: レビューだけでなく、軽量 fix の事実確認 / 単純 patch / plan 文書化にも `/run-codex` を使って Opus quota を節約。

**screenshot 自己評価**: CDP screenshot で各 fix の before/after を取得 → Read で自分で目視評価。DOM 存在だけで判定しない。
</critical-rule>

## 進行モード

現運用は **§11 user-redo depth-first**（`docs/dispatch-operation.md §11` 参照）。
1 issue ごとに「fact 確認 → guideline 引用 → 横展開 audit → 実装 + screenshot 検証 → 1 PR」を完遂してから次へ。並行 PR 禁止。

`status: done` の plan は `docs/l3_phases/archive/` に移動済（490 件アーカイブ済、active は無し）。
