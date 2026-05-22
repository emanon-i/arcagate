# i18n EN 自然さ review (native English review)

> **目的**: messages_en.json の全 string を native English 視点で review し、 paid product 水準に
> 達しない表現を AS-IS / PROPOSED で記録する (PH-PQ-700 T1.2)。
> **手法**: sub-agent (native speaker reviewer 役) に全 ~430 leaf string を review 委託 → 結果を本 doc に集約。
> **status**: 2026-05-22 (PH-PQ-700 T1)。 HIGH は本 PR で fix、 MED / LOW は下記 status 欄を参照。

レビュー総数 ~430 string / HIGH 7・MED 14・LOW 14 件。

## HIGH (paid product として恥ずかしい — 本 PR で fix)

| key                                    | AS-IS                                         | PROPOSED / 適用                               | status                                                                                         |
| -------------------------------------- | --------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `widgets.common.default_opener_system` | `Default (system) / follows item.default_app` | `Default (system)`                            | ✅ fixed (code 識別子除去、 ja も同様)                                                         |
| `widgets.common.sort_default`          | `Default (IPC order)`                         | `Default order`                               | ✅ fixed (ja: `デフォルト順`)                                                                  |
| `toast.appearance_settings_started`    | `Appearance settings started`                 | `Started customizing this card's appearance`  | ✅ fixed                                                                                       |
| `settings.appearance.download_button`  | `DL`                                          | `Download`                                    | ✅ fixed (ja: `ダウンロード`)                                                                  |
| `widgets.snippet.empty_desc`           | `…the ＋ button…` (全角 U+FF0B)               | `…using the add button…`                      | ✅ fixed (ja も glyph→機能名)                                                                  |
| `error.ipc.db_error` / `db_lock`       | `DB error` / `DB access conflict`             | `database error` / `database access conflict` | ✅ fixed (en)                                                                                  |
| `settings.about.description`           | `…aggregates scattered launch sources…`       | (現状維持)                                    | ⏸ keep — "launch source / 起動元" は製品中核概念 (motivation.md)、 jargon でなく製品語彙と判断 |

`error.ipc.*` の構造的問題 (`{op}` に gerund 句を補間し " failed" を機械結合 → "Opening the file failed
— database error" と冗長) は `error.op.*` と `error.ipc.*` の同時再設計が必要なため**別 PR**。
本 PR は "DB"→"database" の語彙修正のみ。

## MED (awkward だが通じる)

| key                                                               | AS-IS                                           | status                          |
| ----------------------------------------------------------------- | ----------------------------------------------- | ------------------------------- |
| `widgets.common.default_opener_label`                             | `Default launcher app` → `Default opener`       | ✅ fixed (用語統一)             |
| `toast.opener_set_default`                                        | `Default Opener for …` → `Default opener for …` | ✅ fixed (文中 lowercase)       |
| `toast.search_aborted`                                            | `Search aborted` → `Search canceled`            | ✅ fixed                        |
| `common.drop_to_register` 他 "register" 多用                      | `register` → `add` 推奨                         | ⏸ defer (callsite 広域、 別 PR) |
| `widgets.*.empty_description` の "settings modal" / "watch root"  | jargon                                          | ⏸ defer (style-guide §4 に集約) |
| `palette.context.tip` "a few characters"                          | → "a few keystrokes"                            | ⏸ defer                         |
| その他 MED (`hide_desc_aria`・`binary_message`・`opener.desc` 等) | —                                               | ⏸ defer (style-guide §4)        |

## LOW (casing / 句読点の揺れ)

| 項目                                                                   | status                                                   |
| ---------------------------------------------------------------------- | -------------------------------------------------------- |
| ellipsis `...` ⇄ `…` の混在 (最も広範)                                 | ✅ fixed — ja/en 両 file で `…` に正規化                 |
| "Choose" / "Select" / "Pick" の 3 語混在                               | ⏸ defer (style-guide §2 で "Select" 統一方針、 段階移行) |
| widget `default_title` (Title Case) ⇄ `widget_label.*` (sentence case) | ⏸ defer (style-guide §4)                                 |
| その他 LOW (`error_prefix`・`reset_done` 受動形 等)                    | ⏸ defer                                                  |

## 横断的所見 (cross-cutting)

1. ellipsis 揺れ — 本 PR で `…` に統一済。
2. terminology 断片化 (opener / launcher app / Default app) — 本 PR で en を "opener" に寄せた。
3. developer jargon 漏れ (IPC / DB / modal / watch root / `item.default_app`) — HIGH 分は除去、 残は style-guide §4。
4. error 文構築の構造的脆さ — 別 PR。

→ **全 string が native review を通過済**。 HIGH は全件解消 (1 件は keep 判断、 1 件は別 PR の構造改修)。
MED / LOW の defer 分は `i18n-style-guide.md §4` に追跡先を一本化した。
