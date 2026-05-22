# i18n 翻訳 style guide (EN)

> **目的**: messages_en.json の英訳を「2 人が書いても同じ表現」になるよう mechanical 化する。
> **対象**: 翻訳追加 / 修正を行う developer・agent。
> **位置づけ**: `docs/l2_foundation/i18n-policy.md` (= ja/en どちらの言語にするかの判定) の **下位**。
> 本 doc は「en にすると決まった文字列を、どう英訳するか」を規定する。
> **status**: 2026-05-22 制定 (PH-PQ-700 T1)。

---

## 1. 基本原則

| # | ルール                                                                                            | 例                                                           |
| - | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 1 | **Sentence case を default** とする。 Title Case は menu item / dialog title のみ                 | "Add item" (○) / "Add Item" (×、 dialog title を除く)        |
| 2 | app 名 **"Arcagate" は翻訳しない**。 大小も変えない                                               | "Welcome to Arcagate"                                        |
| 3 | domain 用語 **Workspace / Widget / Library / Palette** は固有名詞扱いで先頭大文字維持             | "Workspace is empty"                                         |
| 4 | error / 失敗文言は **user action 形** で書く。 "Error:" 前置や受動の羅列をしない                  | "Couldn't open the file" (○) / "Error: file open failed" (×) |
| 5 | **数値は素の "1234"** を default。 桁区切り "1,234" は number formatter (`formatNumber`) 経由のみ | —                                                            |
| 6 | 単複は **`_one` / `_other` の plural key + `tPlural()`** で表現する。 "(s)" hack 禁止             | "{count} item" / "{count} items"                             |
| 7 | **省略記号は `…` (U+2026)** に統一。 ASCII 3 点 "..." は使わない                                  | "Loading…" (○) / "Loading..." (×)                            |

## 2. 用語統一 (terminology)

同一概念に複数語を当てない。 下表の **左の語**で統一する。

| 統一語                 | 使ってはいけない異表記                         | 備考                                                                             |
| ---------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------- |
| **opener** (lowercase) | "launcher app" / "Default Opener" (文中大文字) | Settings の機能名は "Openers"、 文中は lowercase                                 |
| **Select**             | "Choose" / "Pick"                              | ファイル / フォルダ / 項目の選択動詞は "Select" に寄せる (段階移行、 既存は順次) |
| **database**           | "DB"                                           | user-facing error で "DB" を使わない                                             |

## 3. 禁止 (paid product として不可)

- **code 識別子の露出**: `item.default_app` / "IPC order" / "watch root" 等の内部名を UI 文字列に書かない。
- **全角文字の混入**: `＋` (U+FF0B) 等の全角記号を Latin UI 文字列に入れない。 ボタンは glyph でなく
  機能名で参照する (i18n-policy `<critical-rule id="label-content">` と整合)。
- **開発者ジャーゴン**: "modal" / "IPC" / "DB" 等を user に見せない。

## 4. 既知の未対応 (本 phase スコープ外、 後続で解消)

PH-PQ-700 T1 の native review (`i18n-en-review.md`) で med / low と判定した項目のうち、
1 PR の scope を超えるものは下記に集約。 各項目は `i18n-en-review.md` に AS-IS / PROPOSED 記載済。

- `error.ipc.*` の `{op}` 補間構造 (gerund 句 + " failed" の機械結合) は文として不自然。
  `error.op.*` と `error.ipc.*` を一緒に再設計する必要があり、 別 PR。
- "Choose" / "Select" / "Pick" の全 callsite 統一は段階移行 (本 PR では新規分のみ "Select")。
- widget の `default_title` (Title Case) と `widget_label.*` (sentence case) の casing 不一致。
