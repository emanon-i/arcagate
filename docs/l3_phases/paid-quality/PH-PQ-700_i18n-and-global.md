---
id: PH-PQ-700
status: planning
batch: paid-quality
type: 改善
era: Polish → Distribution
parent: README.md
---

# PH-PQ-700: i18n & Global — EN を ja と同格に + 文化中立化

## 問題

「**ja-only**」 のままでは paid product として海外市場 (paid sales の現実的な拡大領域) に出せない。 国内市場だけでは Windows 個人 launcher 買い切り \$10-25 は **年 \$5-15K のオーダー** (Listary 価格帯ベンチ)、 EN を加えると **paid sales の TAM が 10-50 倍**。 値踏み Claude 版 H1 でも「i18n EN UI 完成」 が High 優先で挙げられている。

ただし、 「EN UI 切替えできる」 と「EN として自然」 は別物。 paid product 水準では後者が必須。

### 現状 (本 plan で実 audit)

| 軸                               | 現状                         |
| -------------------------------- | ---------------------------- |
| key parity (ja ⇄ en)             | **909 / 909** (両 file 一致) |
| EN string 総数 (value 持ち)      | **818**                      |
| EN value が ja と同一 (未翻訳)   | **30 件**                    |
| EN value に日本語文字残り        | **1 件**                     |
| 翻訳済みだが「英語として不自然」 | 未測定、 推測 30-100 件      |
| 日付 formatter                   | `'ja'` 固定 (vision.md H3)   |
| 数値 / 通貨 formatter            | (未調査)                     |
| RTL (Arabic / Hebrew) 準備       | なし、 layout は LTR 前提    |
| 文化中立 icon / 色 (祝日色等)    | 未 audit                     |

つまり **parity OK、 中身は半端**。 paid v1 では「EN として恥ずかしくない」 まで持っていく。

### Web 業界基準 (海外 paid Windows app)

- **EAA (European Accessibility Act 2025-06-28〜)**: 欧州販売の paid アプリは a11y + lang 要件 (`PQ-300 §WCAG 2.2`)
- **海外 paid app の文化中立**: 通貨表示は ロケール formatter / 「赤 = warning」 の文化偏見排除 / icon の手のジェスチャー (👍 等) の地域差
- **i18n library 業界標準**: ICU / FormatJS / i18next 等、 Arcagate は自前で十分 (key 909 件は中規模)

## スコープ

1. **EN value sweep**: 未翻訳 30 件 + 不自然な翻訳 (推測 30-100 件) を native review レベルへ
2. **動的 string の i18n 強化**: format placeholder `{name}` 補間、 ja の数量別形 (1 件 / 複数件) と en の plural 差を吸収
3. **日付 / 数値 / 通貨 formatter**: 現状 `'ja'` 固定 → user 設定の locale に従う (`Intl.DateTimeFormat` / `Intl.NumberFormat`)
4. **文化中立化**: icon / 色 / 文言の地域偏見 audit
5. **RTL 準備**: CSS で `dir=rtl` を想定した layout (実装は別 phase、 本 phase は構造の前準備のみ)
6. **`audit-i18n-hardcode.sh` の維持**: 新規 string が key 経由を強制
7. **EN release の e2e** (locale=en で全 critical-path / a11y spec を verify)

## やらないこと

- 第 3 言語追加 (zh / ko / es): 別 plan、 EN parity 確立後
- 完全な機械翻訳化 (DeepL / GPT API 経由) — 機械翻訳 lock は paid quality に到達しない、 本 plan では human review + tooling assist
- locale 切替え時の UI live reload 改修 (現状 reload で OK)
- 通貨 / 税表示 (Arcagate に sales 機能なし、 範囲外)

## 具体タスク

### T1. EN value 未翻訳 30 件 + 不自然翻訳の特定 + 翻訳

audit 手段:

1. **未翻訳特定**: `src/lib/i18n/messages_{ja,en}.json` を deep flatten、 同一 value を全件抽出 → list (本 plan で実 audit 済、 30 件)
2. **不自然翻訳特定**: 全 EN value を native English の文脈で再 review。 sub-agent (general-purpose) に 「以下の EN 文字列群を native English speaker 視点で評価、 不自然な物は AS-IS / 提案 PROPOSED を返せ」 で reviewer 役を委託。 結果を `docs/l3_phases/paid-quality/audit/i18n-en-review.md` に保存
3. **日本語残り 1 件**: 直接 fix

特定後の修正:

- `messages_en.json` を 1 PR で update (key 単位で diff)
- 翻訳 style guide を `docs/l3_phases/paid-quality/audit/i18n-style-guide.md` として残す:
  - Sentence case を default (Title Case は menu item / dialog title のみ)
  - 数値は **1234** (no comma) を default、 \"1,234\" は number formatter 経由のみ
  - app 名 「Arcagate」 は翻訳しない
  - 専門用語 (Workspace / Widget / Library) は EN で stable、 ja でカタカナ
  - error 文言は「user action」 で書く (\"Couldn't open the file\" not \"Error: file open failed\")

### T2. 動的 string の i18n 強化

現状 `{name}` placeholder 補間が `messages_*.json` 内に存在 (fact 確認、 `$comment` で言及)。 plural / gender 別形は ja は不要 (敬語形は除く)、 en では必要:

- 「1 item / 2 items」 「1 widget / 2 widgets」 等を i18n key 内で `_one` / `_other` suffix で分岐
- 例: `library.itemCount_one: "1 item"` / `library.itemCount_other: "{count} items"`
- `src/lib/i18n.svelte.ts` に `t.plural(key, count)` helper を追加
- 既存 string で count を含むものを全件 grep → plural 形へ migration

### T3. 日付 / 数値 / 通貨 formatter

- `src/lib/i18n.svelte.ts` に `formatDate(date, locale)` / `formatNumber(num, locale)` を追加
- `Intl.DateTimeFormat(currentLocale, opts)` / `Intl.NumberFormat(currentLocale, opts)` を wrap
- 既存 component で `toLocaleString('ja')` 等 hardcoded を全件 grep → helper 経由へ
- Stats widget / DailyTask widget / Library 「最終更新」 等の表示が locale 切替で正しく更新されることを e2e で verify

### T4. 文化中立化 audit

agent dev + sub-agent で全画面 sweep:

- **色の文化偏見**: 「赤 = warning」 「緑 = OK」 の度合いを reduce、 アイコン + 文言で重ね伝達 (color blindness 配慮 = WCAG 2.2 1.4.1 Use of Color と整合、 PQ-300 と統合)
- **icon の地域差**: 「いいね 👍」 は中東で侮辱、 「OK 👌」 は仏 / 伯で侮辱。 lucide-icons などの中立 icon は OK だが、 emoji は restraint
- **日付 format**: 「2026-05-22」 ISO 形式を default、 「May 22, 2026」 (US) / 「22 May 2026」 (UK) は locale formatter 経由
- **曜日順**: ja / en 両方で **月始まり / 日始まり** を user 設定可に (Calendar widget A2 と統合)
- **app 名固有名詞**: Arcagate は維持、 翻訳しない

### T5. RTL 準備 (実装は別 plan)

- `src/app.css` 既存の `direction: ltr` 前提を見直し
- 全 component で `padding-left/right` を `padding-inline-start/end` (logical property) へ移行できそうか調査
- 全 component の icon 配置で 「→」 矢印が「←」 になる layout を grep
- 結果を `docs/l3_phases/paid-quality/audit/rtl-readiness.md` に記録

実装は別 phase (paid v1 後)、 本 phase では **準備調査のみ**。

### T6. `audit-i18n-hardcode.sh` の維持

既存 audit script (`scripts/audit-i18n-hardcode.sh` fact 確認済) が 0 violations を維持:

- 新規 T1-T5 の改修で hardcode 増えていないことを確認
- 新規 widget (PQ-600 A1-A4) の i18n key 追加時の漏れを検出
- T2 plural 形 migration で旧 key と新 key の整合が取れていることを assert

### T7. EN release の e2e

`tests/fixtures/global-setup.ts:77` の locale 強制を **ja / en の 2 mode** へ:

| mode      | env var                            | spec scope                                                                                     |
| --------- | ---------------------------------- | ---------------------------------------------------------------------------------------------- |
| ja (現状) | `ARCAGATE_E2E_LOCALE=ja` (default) | 既存 9 spec                                                                                    |
| en (新規) | `ARCAGATE_E2E_LOCALE=en`           | 新規 `tests/e2e/locale-en/*.spec.ts` (critical-path / a11y / setup-wizard の 3 件を en で再走) |

CI 統合:

- `.github/workflows/e2e.yml` で en spec を並列実行
- en mode で axe (PQ-300 T4) も走らせる、 WCAG 2.2 AA pass

参考: 既存 `tests/e2e/locale-switch.spec.ts` (locale 切替 verify) を hub に拡張 ([`memory/feedback_i18n_e2e_locale_isolation.md`](../../../.claude/memory/feedback_i18n_e2e_locale_isolation.md) 2026-05-15 確定の「locale 強制が必須」 教訓を遵守)。

## 受け入れ条件

- [ ] T1 EN 未翻訳 30 件すべて翻訳、 日本語残り 1 件 fix、 style guide doc 化
- [ ] T1 不自然翻訳 review が doc 化 (`i18n-en-review.md`)、 全件 native review pass
- [ ] T2 plural 形 key を全件 migration、 `t.plural()` helper 動作
- [ ] T3 日付 / 数値 formatter が locale 設定に従う、 e2e で ja / en 両方 verify
- [ ] T4 文化中立 audit が doc 化、 重大違反 0 件 (例: 👍 emoji 使用箇所 0)
- [ ] T5 RTL 準備調査 doc 化、 移行不能箇所が明示
- [ ] T6 `audit-i18n-hardcode.sh` 0 violations 維持
- [ ] T7 en spec が CI で pass、 axe en mode も pass

## 工数感

| Task                                   | 工数            | 依存                            |
| -------------------------------------- | --------------- | ------------------------------- |
| T1 EN value sweep (translate + review) | 1 週間          | sub-agent 並列で 2-3 日に圧縮可 |
| T2 plural 形 i18n                      | 2-3 日          | T1                              |
| T3 formatter locale 対応               | 2 日            | —                               |
| T4 文化中立 audit                      | 1-2 日          | PQ-300 と並行                   |
| T5 RTL 準備調査                        | 1 日            | —                               |
| T6 audit 維持                          | (継続、 工数 0) | —                               |
| T7 en e2e                              | 2-3 日          | T1-T3 完了                      |
| 合計                                   | **2-3 週間**    | (PQ-200 / PQ-300 と並行可)      |

## 依存・着手順

1. **先行**: PQ-100 完了 (panic-clean な base)
2. **並行**: PQ-200 first-run + PQ-300 craft sweep + PQ-500 completeness と並行可能 (干渉ほぼなし)
3. **後続**: PQ-600 widget expansion で新 widget の i18n を ja / en 同時実装

## 横展開チェック

- 既存 `audit-i18n-hardcode.sh` が新規追加 string で fail しないこと
- T3 formatter で `feedback_i18n_e2e_locale_isolation.md` (2026-05-15 確定) の教訓を遵守、 e2e で locale 強制が必須
- 新規 widget (PQ-600) の string も ja / en 同時で release、 「ja で merge、 en は後追い」 を禁止 (`do-it-now-philosophy`)
- RTL 準備調査は **paid v1 で完了不要**、 paid v1.x の任意 phase で実装可能

## 参照

- 現状 i18n: `src/lib/i18n/messages_{ja,en}.json` (909 key parity、 本 plan で fact 確認)
- i18n policy: [`docs/l2_foundation/i18n-policy.md`](../../l2_foundation/i18n-policy.md)
- 既存 audit script: `scripts/audit-i18n-hardcode.sh`
- locale 強制教訓: [`memory/feedback_i18n_e2e_locale_isolation.md`](../../../.claude/memory/feedback_i18n_e2e_locale_isolation.md) (2026-05-15 確定)
- vision.md i18n: [`docs/l1_requirements/vision.md`](../../l1_requirements/vision.md) H1-H3
- Web a11y EAA 2025: [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/) (EU Accessibility Act との連動)
- 値踏み: [PRODUCT_VALUATION H1 i18n EN](../../../.claude/worktrees/upbeat-mclaren-8f3c55/docs/l3_phases/audit/PRODUCT_VALUATION_2026-05-21.md)
