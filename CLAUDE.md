# Arcagate — Agent Instructions (session 開始時必読)

PC 上に散在する起動元 (Steam ゲーム / 開発ツール / スクリプト / URL ...) を 1 箇所に集約する個人用ランチャー。 Tauri v2 + SvelteKit + Svelte 5 runes + Rust + SQLite。 Windows 単独 user / ローカル完結 / 配布水準を常に狙う daily-use ツール。

このファイルは **コードから読み取れない情報 + session 開始時に必要な情報 + 所在 pointer** だけを書く。 詳細仕様 / アーキテクチャ / テストシナリオ等は docs/ を参照。

---

## 作業前に必ず読む

1. **[docs/motivation.md](docs/motivation.md)** — L0 製品要求 (なぜ / 何 / 誰 / Non-goals / 成功条件 / 制約 / 利用形態 / 失敗パターン)
2. **[docs/l2_foundation/foundation.md](docs/l2_foundation/foundation.md)** — 全体アーキテクチャ
3. **[docs/l2_foundation/screens/](docs/l2_foundation/screens/)** — 該当画面の機能カタログ
4. **[docs/l2_foundation/test_scenarios.md](docs/l2_foundation/test_scenarios.md)** — 該当 phase の test 要件
5. **[docs/lessons.md](docs/lessons.md)** — 過去の失敗 / 再発防止 (メタ教訓のみ、 個別 bug は git log)
6. 該当 phase plan: **[docs/l3_phases/_archive/](docs/l3_phases/_archive/)** (完了済 plan の参照)

---

## 哲学 (最上位、 判断はここから)

<critical-rule id="daily-use-test">
「**毎日使えるか？**」 で全機能を判断。 微妙なら削る。 配布水準を常に狙う。
</critical-rule>

<critical-rule id="instant-feedback">
**設定変えたら即見た目が変わる**。 遅延反映は欠陥。
</critical-rule>

<critical-rule id="dom-not-fixed">
**「DOM 存在 = 治った」 判定 禁止**。 「pnpm verify pass = 治った」 と書かない。 **画面で目視確認**できるまで 「治った」 と言わない (自分で screenshot 撮って Read で読み返す)。 最終判定は user dev 検収。
</critical-rule>

<critical-rule id="agent-self-complete">
**user に dev 起動 / dump / 動作確認 / DB 操作を一切依頼しない**。 agent dev (CDP attach + `WEBVIEW2_USER_DATA_FOLDER` で隔離) で完結する。 profile / debug / 真因特定は agent dev + 実 data scale の seed (100+ items / 多型混在 / icon_path 設定) で完結。 user に観察データを求めるのは規律違反 (2026-05-07 user 指摘)。
</critical-rule>

<critical-rule id="lateral-sweep">
**1 つの不整合を発見したら横展開で全画面 audit**。 1 file 直して終わりにしない。 同 pattern が他に無いか必ず grep。 (2026-05-13 EXE folder cascade 横展開漏れの教訓)
</critical-rule>

<critical-rule id="reproduce-before-asking">
vague な user 表現 (「変な位置」 「効かない」 「崩れる」) は agent が **実コード read + dev で reproduce 試行**を先に。 screenshot 要求は agent が複数 hypothesis を試して全 fail した時の **last resort**。 (2026-05-13 D&D 位置の screenshot 要求過剰の教訓)
</critical-rule>

<critical-rule id="cite-guideline">
Plan 文書化時に **引用元 guideline doc + section** を明示する。 「自分の判断」 で書いた箇所は明示マーク。
</critical-rule>

<critical-rule id="label-content">
ラベルは **機能 / 状態 / アクション**を書く。 アイコン名 (「星」 「三本線」 「プラス」) 禁止。 ⭐+「お気に入り」 / ☰+「メニュー」 / ＋+「追加」 が正。
</critical-rule>

---

## 設計の固定枠 (変えない判断)

- レイヤー: `commands → services → repositories → DB` (逆禁止)
- Service Layer が全 IPC エントリーポイントの共通経路、 Repository を直呼びしない、 Repository 間相互参照禁止
- `Mutex<Connection>` + WAL (Pool は過剰) / UUID v7 / `include_str!` で migration 埋込
- `AppError` は `{ code, message }` Serialize 構造体で frontend へ
- ORM 不使用 (rusqlite + 生 SQL)
- 選択肢 1 個の menu を挟まない、 button 押下 = 即 action

---

## 禁止事項

<critical-rule id="forbidden">
- `src/lib/components/ui/` 手動編集 (shadcn-svelte scaffold、 lint 除外済) — 例外: build / 型 error 修正のみ
- ORM 導入 (diesel / sqlx / sea-orm)
- `status: done` の L0/L2 ドキュメント書き換え
- `--no-verify` で hook bypass
- 実機目視なしで完了報告
- **color hardcode 禁止**: component で `#ffe600` / `rgba(...)` / `bg-yellow-500` 等の生色値を書かない、 必ず `var(--ag-accent)` / `var(--ag-warm-text)` / `var(--ag-text-*)` / `var(--ag-surface-*)` 等 theme tokens 経由 (pre-commit `design-tokens` hook で機械検出)。 Industrial Yellow direction 撤回済 (2026-05-07、 `memory/feedback_industrial_yellow_revoked.md` 参照)
</critical-rule>

---

## Branch / commit 運用

- main 直 push OK、 PR は大きな変更単位で任意
- prefix: `feat/*` / `fix/*` / `chore/*` / `docs/*` (通常)、 `refactor/*` (大規模)
- test gate (svelte-check / clippy / cargo test / build) は全 branch 同一
- frontend test は T1-T4 plan で incremental 再構築中 ([test_scenarios.md](docs/l2_foundation/test_scenarios.md))
- Rust inline test (`#[cfg(test)]`) は維持 (migration safety / build correctness)

---

## 開発ルーチン

- `pnpm verify` — biome / dprint / clippy / rustfmt / svelte-check / cargo test (全段 pass が前提)
- `pnpm tauri dev` — 開発起動。 CDP 経由で agent も操作する場合 `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9515` を付ける (user dev port と被らないよう agent は別 port、 別 worktree、 別 `WEBVIEW2_USER_DATA_FOLDER` で隔離)
- `pnpm test:e2e` — Playwright E2E (user 許可制)
- lefthook = staged file scope。 CI が真の品質ゲート

---

## agent 運用

<critical-rule id="ops">
**モデル使い分け**: 軽作業 (grep / lint / format / verify / 単純 fix) = Sonnet、 設計判断 / 多面的解析 = Opus。 `/model opusplan` で自動切替。

**sub-agent 並列**: 独立 task (screenshot 撮影 / fact 確認 / grep audit) は Task tool で sub-agent に分離して context を隔離。

**Codex 二次活用**: review だけでなく、 軽量 fix の事実確認 / 単純 patch / plan 文書化にも `/run-codex` を使って Opus quota を節約。

**screenshot 自己評価**: CDP screenshot で各 fix の before/after を取得 → Read で自分で目視評価。 DOM 存在だけで判定しない (`dom-not-fixed` rule)。
</critical-rule>

---

## 進行モード

1 issue ごとに「fact 確認 → guideline 引用 → 横展開 audit → 実装 + screenshot 検証」を完遂してから次へ。

複数 PR を同時並行で進めない (`feedback_serial_pr_discipline.md` 参照、 2026-05-07 確定)。

---

## 迷ったら (routing)

| 状況                                                 | 読む doc                                 |
| ---------------------------------------------------- | ---------------------------------------- |
| 製品の範囲 / scope 判断                              | `docs/motivation.md`                     |
| 設計判断 / 技術選定 / レイヤー / IPC / state / error | `docs/l2_foundation/foundation.md`       |
| 該当画面の挙動 / 機能カタログ                        | `docs/l2_foundation/screens/<screen>.md` |
| test 要件 / scenario                                 | `docs/l2_foundation/test_scenarios.md`   |
| 過去の失敗 / 再発防止                                | `docs/lessons.md`                        |
| 完了済 plan 参照                                     | `docs/l3_phases/_archive/`               |

---

## 他プロジェクトとの関係

本 repo は **独立 module**。 外部 monorepo / parent repo に依存しない (`E:\Cella\Projects\arcagate\` 配下のみで完結)。

memory (永続) は `C:\Users\gonda\.claude\projects\E--Cella-Projects-arcagate\memory\` (repo 外、 agent session 跨ぎで参照)。 詳細は `memory/MEMORY.md` 参照。

---

## Codex 経路

- `/run-codex review <path>` で 2nd opinion / 軽量 review
- `/run-codex security <path>` / `/run-codex refactor <path>` 等の専用 prompt あり
- skill 詳細: `C:\Users\gonda\.claude\skills\run-codex\SKILL.md`
- 軽量 fix の事実確認 / plan 文書化にも活用して Opus quota 節約 (上記 `ops` rule)
