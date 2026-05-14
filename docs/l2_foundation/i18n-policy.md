# i18n Policy

> **目的**: hardcoded string を migration する時に **「2 人が適用しても同じ答え」 になる mechanical 判定**で 「英語 keep / 翻訳 / icon 化 / dedup」 を即決判断。
> **対象**: 全 frontend developer / agent / refactor 担当。
> **永続性**: design system の中核、 i18n 着手時の判定基準、 button-usage.md と並ぶ L2 design doc。
> **status**: 2026-05-15 制定 (初版) / 2026-05-15 refined rule (= 認知負荷 boundary) / 2026-05-15 mechanical 3 基準 全面 refine (= 「2 人が同じ答え」 を満たす objective 判定 確立、 user 確定)。
> **背景**: motivation.md (= JP-only → Microsoft Store + 海外展開対応 update 済) で i18n architecture 確定。 「英語のまま OK」 「過剰翻訳」 「dedup 漏れ」 「中途半端な英語残し」 を **subjective でなく mechanical** に判定する rule が必要。

---

## 0. 核 mechanical 3 基準 (= 「2 人が同じ答え」 を満たす objective 判定)

旧 「認知負荷」 「読解が要るか」 表現は subjective、 本 doc では **「配置場所」 「文法構造」 「文字数」 の 3 基準で objective 化**。 適用順は §1 decision tree 参照。

### 基準 1: 配置場所 (location-based) — 最も mechanical

UI slot ごとに **言語を固定**。 配置場所がわかれば言語が一意に決まる。

| UI slot (= 配置場所)                                          | 言語                        | category         | 根拠                                                            |
| ------------------------------------------------------------- | --------------------------- | ---------------- | --------------------------------------------------------------- |
| **nav menu item** (TitleAction / page tab)                    | 英語                        | (B) ja===en      | Library / Workspace / Settings / Help — 構造ラベル              |
| **widget registry 名** (`WIDGET_LABELS`)                      | 日本語                      | (C) 翻訳         | domain 名、 英語 「Folder Watch」 では意味伝達薄                |
| **widget settings dialog 内 label**                           | 日本語                      | (C) 翻訳         | form label                                                      |
| **empty-state title** (= 1 行 status)                         | 英語短文                    | (B) ja===en      | "No items" / "Library is empty"                                 |
| **empty-state description** (= title 下の説明文)              | 日本語                      | (C) 翻訳         | instructional                                                   |
| **tooltip** (= hover で出る補助 text)                         | 日本語                      | (C) 翻訳         | 補助説明、 文                                                   |
| **button label** (= visible text on `<Button>`)               | button-usage.md rubric 準拠 | —                | (a)-(d) で個別判定、 (e) icon は visible なし → aria-label のみ |
| **button aria-label** (= 不可視、 screen reader が読む)       | 日本語                      | (C) 翻訳         | a11y、 完全文で意図伝達                                         |
| **error message** (toast / alert)                             | 日本語                      | (C) 翻訳         | 操作失敗の正確伝達                                              |
| **toast** (success / info / error 通知)                       | 日本語                      | (C) 翻訳         | UI 文脈                                                         |
| **form label** (= input / select 横の名前)                    | 日本語                      | (C) 翻訳         | form                                                            |
| **placeholder** (= input/select の空時 hint)                  | 日本語                      | (C) 翻訳         | instructional hint                                              |
| **選択肢 label** (radio / select option / chip)               | 日本語                      | (C) 翻訳         | 選択意図                                                        |
| **brand 名** (Arcagate / Steam / GitHub / VS Code / Tauri 等) | 英語 literal                | (A) literal keep | 固有名詞                                                        |
| **技術略語** (CPU / RAM / API / JSON / SQL / URL 等)          | 英語 literal                | (A) literal keep | universal 技術 fact                                             |
| **hotkey 表示** (Ctrl+Z / Esc / Tab 等)                       | 英語 literal                | (A) literal keep | OS 慣習                                                         |
| **file 拡張子** (.exe / .md / .json)                          | 英語 literal                | (A) literal keep | universal                                                       |
| **file 名 / version** (README.md / v1.0.0 / MIT)              | 英語 literal                | (A) literal keep | universal                                                       |
| **universal icon-only ボタン** (close / settings / more 等)   | (D) icon-only               | —                | visible text 撤去、 aria-label のみ (C) 翻訳                    |

### 基準 2: 文法構造 (= location で迷う場合の fallback、 mechanical)

location table で該当 slot 不明な場合、 **文法的判定** で言語決定:

| 文法的特徴                                                                                                   | 言語                   |
| ------------------------------------------------------------------------------------------------------------ | ---------------------- |
| **述語 (動詞 / 形容詞 / です・ます) を含む** (例: 「できます」 「あります」 「失敗しました」 「保存します」) | **日本語必須** (C)     |
| **助詞 (を / が / に / へ / で / と / は / も / の) を含む**                                                 | **日本語必須** (C)     |
| **名詞 / 名詞句のみ** (= 述語なし、 助詞なし)                                                                | **英語化候補** (B / D) |

例:

- 「ファイルをドロップして登録できます」 = 助詞「を」 + 述語「できます」 → **日本語必須 (C)**
- 「ライブラリを検索」 = 助詞「を」 + 述語「検索」 → **日本語必須 (C)**
- 「設定」 = 名詞のみ → **英語化候補** ("Settings")
- 「リスト表示」 = 名詞句のみ → **英語化候補** ("List view") or icon 化 (☰)
- 「No items」 = 名詞のみ status → **英語短文 OK (B)**

### 基準 3: 文字数 tiebreaker (= 名詞句が長い場合の補助)

基準 2 で英語化候補と判定された名詞句が、 **英語化すると長くなる** 場合は再考:

- **英語にして 3 単語以内 / 25 文字以内** → 英語化 (B / D) OK
- **3 単語超 / 25 文字超** → 日本語のまま (C) (= 長英語は読みづらい)

例:

- 「設定」 → "Settings" (= 1 word, 8 char) ✓ 英語化
- 「リスト表示」 → "List view" (= 2 word, 9 char) ✓ 英語化 or icon
- 「ファイルプレビュー」 → 仮に "File preview" (= 2 word, 12 char) は 英語化候補だが、 これは widget 名 (§0 基準 1 で「widget registry 名 → 日本語」 で確定) → **基準 1 が優先**、 文字数判定不要

---

## 1. Decision Tree (= 即決 flow、 mechanical 3 基準準拠)

```
1. これ brand / 技術略語 / hotkey / file 拡張子 / file 名 / version か?
   → YES: (A) literal keep、 i18n 通さない、 hardcoded literal のまま
   → NO: 次

2. これ universal icon (close × / settings ⚙ / etc) で text 不要か?
   → YES: (D) icon-only 化、 visible text 撤去、 aria-label のみ t(common.X)
   → NO: 次

3. §0 基準 1 「配置場所 table」 で言語が一意に決まるか?
   → YES: table の言語に従う (= 場所が決まれば言語は一意、 基準 2/3 バイパス)
   → NO: 次

4. §0 基準 2 「文法構造」: 述語 or 助詞 を含むか?
   → YES: (C) 日本語必須、 t() 化
   → NO (= 名詞 / 名詞句のみ): 次

5. §0 基準 3 「文字数」: 英語化して 3 単語以内 / 25 文字以内か?
   → YES: (B) ja===en で英語化
   → NO: (C) 日本語のまま、 t() 化

6. (C) 確定後、 2 箇所以上で同 JP 文言か?
   → YES: `t('common.X')` に dedup
   → NO: `t('<area>.sub.name')` で area-specific
```

### 判定例 (= 2 人が同じ答えになる verify)

| 文字列                                             | step                                                     | category                                       |
| -------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------- |
| 「Ctrl+Shift+Space」                               | 1 (hotkey)                                               | (A) literal keep                               |
| 「×」 close button                                 | 2 (universal icon)                                       | (D) icon-only、 aria-label = t('common.close') |
| 「Library」 (nav tab)                              | 3 (table: nav menu item → 英語)                          | (B) "Library"                                  |
| 「フォルダ監視」 widget 名                         | 3 (table: widget registry 名 → 日本語)                   | (C) "フォルダ監視"                             |
| 「Library is empty」 empty-state title             | 3 (table: empty-state title → 英語短文)                  | (B) "Library is empty"                         |
| 「ファイルをドロップして登録できます」             | 4 (助詞「を」 + 述語「できます」)                        | (C) 日本語必須                                 |
| 「ライブラリを検索」 placeholder                   | 3 (table: placeholder → 日本語)                          | (C) 日本語必須                                 |
| 「設定」 (panel header、 nav 以外で見つかった場合) | 4 NO (名詞) → 5 YES (英 "Settings" 1 word)               | (B) "Settings"                                 |
| 「リスト表示」                                     | 4 NO (名詞句) → 5 YES (英 "List view" 2 word)            | (B) or 2 (D) icon                              |
| 「キャンセル」 form button                         | 3 (table: button label → rubric 準拠 form action は (C)) | (C) common.cancel                              |

→ 「step 3 (location)」 が最強、 location で決まったら基準 2/3 はバイパスされる。

---

## 2. 各 category の詳細 (= mechanical 判定後の実装)

### (A) literal keep (= i18n を通さない)

**該当**: §0 基準 1 の 「brand / 技術略語 / hotkey / file ext / file 名 / version」 slot

**実装**: hardcoded literal のまま、 messages_ja.json に入れない、 lint (audit-i18n-hardcode.sh) で **これらを除外する pattern 必要** (= 翻訳漏れ誤検出防止、 別 PR で script 拡張予定)。

### (B) ja===en key 化 (= 翻訳 work 0、 経路一貫)

**該当**: §0 基準 1 の 「nav menu / empty-state title」 + 基準 2/3 で英語化判定された名詞句 (3 word / 25 char 以内)

**実装**: messages_ja.json + messages_en.json で **同 value** で key 化、 `t('nav.X')` 経由で参照。

### (C) 翻訳対象 (= 通常の i18n、 ja → en 翻訳必要)

**該当**: §0 基準 1 の 「widget 名 / form / error / toast / aria-label / tooltip / placeholder / 説明 / 選択肢」 + 基準 2 で述語/助詞含む文 + 基準 3 で英語化したら長すぎる名詞句

**実装**: `t('area.sub.name')` で migration、 messages_ja.json + messages_en.json で別 value、 dedup 厳守 (= §3)。

### (D) icon-only 化 (= text 撤去、 aria-label のみ翻訳対象)

**該当**: §0 基準 1 の 「universal icon-only ボタン」 slot

**判定**: button-usage.md rubric (e) icon-only と整合、 universal recognition の icon が存在する操作:

- close (`X`) / settings (`Settings`) / search clear (`X` in search box) / add (`Plus`) / delete (`Trash2`) / edit (`Pencil`) / copy (`Copy`) / more (`MoreHorizontal`) / expand-collapse (`ChevronUp/Down`) / view mode (`Grid3x3` / `LayoutList`) / back-next (`ChevronLeft/Right`) / refresh (`RefreshCw`) / external link (`ExternalLink`) / undo (`Undo2`)

**実装**: `<Button variant="ghost" size="icon">` + icon component + `aria-label={t('common.X')}` (= visible text 撤去、 a11y のみ翻訳)。

---

## 3. dedup rule (= common.* namespace)

### 判定: **2 箇所以上で同一文言** → `common.*` に昇格

- `common.cancel` (= 「キャンセル」 が 3+ file で使用)
- `common.save` / `common.delete` / `common.close` / `common.edit` / `common.change` / `common.add` / `common.back` / `common.next` / `common.loading` / `common.no_match` / etc.

### area-specific namespace は **その画面固有** のみ

- `library.empty_title` (= Library 画面でのみ表示)
- `palette.no_recent` (= palette でのみ)
- `settings.hotkey.label` (= settings でのみ)

### 重複検知

PR review 時に **既 messages_ja.json に同 value (= 同 JP 文言) を別 key で追加してないか** grep audit。

---

## 4. Anti-pattern (= 構造的に防ぐ NG patterns)

### ❌ NG

1. **「なんとなく英語のまま」** = §0 基準 1-3 で説明できない英語 hardcoded
2. **過剰翻訳** = (A) literal keep すべき brand / 略語を t() 化
3. **dedup 漏れ** = 同 JP 文言を area-specific key で個別作成
4. **icon 化漏れ** = §0 基準 1 「universal icon-only」 該当なのに text-only button
5. **混在中途半端** = 同 area / 同 slot で **rule なしの無意識** 不整合
   - 例: nav 4 item で「Library / Workspace / 設定 / ヘルプ」 (= rule 不在の 2:2 混在)

### ✅ OK: 「rule-based 混在」 は意図的

§0 基準 1 配置場所 table に従う **意図的な混在は OK**:

- nav (英語) + widget 名 (日本語) + status (英語短文) + 説明文 (日本語) の組合せ → **基準 1 で説明できる** rule-based mix
- 判定: **§0 基準 1-3 で説明できる** が OK、 「なんとなく」 が NG

---

## 5. 既 messages_ja.json (post #466/#467) audit (= mechanical 基準 適用)

| key                                                           | value                            | slot (§0 基準 1)            | 文法 (§0 基準 2)                | 文字数 (§0 基準 3) | 判定                                              |
| ------------------------------------------------------------- | -------------------------------- | --------------------------- | ------------------------------- | ------------------ | ------------------------------------------------- |
| `app.name`                                                    | "Arcagate"                       | brand 名 → 英語 literal     | —                               | —                  | (A) literal だが key 化済 OK                      |
| `nav.{library,workspace,settings,help}`                       | 英語                             | nav menu item → 英語        | —                               | —                  | (B) ja===en ✓ (PR #466)                           |
| `common.{cancel,save,delete,close,edit,change,add,back,next}` | JP                               | form button → 日本語        | 名詞                            | —                  | (C) 翻訳 dedup ✓ (基準 1 で form button = JP fix) |
| `common.loading`                                              | "Loading…"                       | empty-state status → 英短文 | 名詞                            | 1 word             | (B) ✓ (PR #467)                                   |
| `common.no_match`                                             | "No match"                       | empty-state status → 英短文 | 名詞句                          | 2 word             | (B) ✓ (PR #467)                                   |
| `library.add_item`                                            | "アイテムを追加"                 | form action button label    | 助詞「を」 + 述語「追加」       | —                  | (C) 翻訳 ✓ (基準 2 で日本語確定)                  |
| `library.empty_title`                                         | "Library is empty"               | empty-state title           | 名詞句 status                   | 3 word             | (B) ✓ (PR #467)                                   |
| `library.search_placeholder`                                  | "ライブラリを検索"               | placeholder                 | 助詞「を」 + 述語「検索」       | —                  | (C) ✓ (基準 1 placeholder = JP、 基準 2 でも JP)  |
| `workspace.empty_title`                                       | "Workspace is empty"             | empty-state title           | 名詞句 status                   | 3 word             | (B) ✓ (PR #467)                                   |
| `workspace.wallpaper_set`                                     | "このワークスペースの壁紙を設定" | aria-label / tooltip        | 助詞「の」「を」 + 述語「設定」 | —                  | (C) 翻訳 ✓                                        |
| `palette.search_placeholder`                                  | "検索..."                        | placeholder                 | 名詞 + 省略記号                 | —                  | (C) ✓ (基準 1 placeholder = JP)                   |
| `palette.no_recent`                                           | "No recent items"                | empty-state status          | 名詞句                          | 3 word             | (B) ✓ (PR #467)                                   |
| `settings.category_label`                                     | "設定カテゴリ"                   | aria-label                  | 名詞句                          | —                  | (C) ✓ (基準 1 aria-label = JP)                    |
| `settings.loading`                                            | "設定を読み込み中..."            | loading status              | 助詞「を」 + 述語「中」         | —                  | (C) ✓ (基準 2)                                    |
| `settings.hotkey.label`                                       | "ホットキー表示"                 | aria-label                  | 名詞句                          | —                  | (C) ✓ (基準 1 aria-label)                         |
| `settings.hotkey.press_key`                                   | "キーを押してください..."        | input value (instructional) | 助詞「を」 + 述語「ください」   | —                  | (C) ✓                                             |
| `settings.hotkey.change`                                      | "ホットキーを変更"               | tooltip / title             | 助詞「を」 + 述語「変更」       | —                  | (C) ✓                                             |
| `dialog.confirm_delete`                                       | "削除しますか?"                  | confirm question            | 述語「ます」                    | —                  | (C) ✓                                             |
| `dialog.unsaved_changes`                                      | "保存されていない変更があります" | error / warning             | 助詞 + 述語                     | —                  | (C) ✓                                             |
| `toast.{saved,deleted,error}`                                 | JP                               | toast → 日本語              | 述語                            | —                  | (C) ✓                                             |

**全 key が §0 基準 1-3 で mechanical に説明可能** = anti-pattern §4-5 「rule なしの無意識混在」 0 件、 「2 人が同じ答え」 を満たす状態に到達。 mechanical 判定 verify 完了。

---

## 6. 適用 procedure (= 続 PR で守る flow)

1. **hardcoded string を見たら** §1 decision tree で判定 (= 6 step)
2. **PR description で category 明示**: 「(A) literal: N 件 / (B) ja===en: M 件 / (C) 翻訳: K 件 / (D) icon 化: L 件」 + **各 string の判定 path (step 番号 + slot 名 or 文法判定)** を 1 行記録
3. **(C) 翻訳追加時** dedup audit (= 既存 key に同 value あれば集約)
4. **(D) icon 化時** button-usage.md rubric §2-3 と整合
5. **review**: 各 string が §0 基準 1-3 で説明できるか self-check
6. lint pass: `audit-i18n-hardcode.sh` budget within

---

## 7. 参照

- `src/lib/i18n.svelte.ts` — i18n infrastructure (= `t(key)` / `setLocale()` / `detectOsLocale()`)
- `src/lib/i18n/messages_ja.json` — ja messages (本 doc rule で構造化)
- `src/lib/i18n/messages_en.json` — en messages (Phase 3 後半で整備)
- `scripts/audit-i18n-hardcode.sh` — hardcoded JP budget gate (lefthook pre-commit)
- `docs/l2_foundation/button-usage.md` — button rubric (= icon-only 化判定と整合)
- `docs/l0_ideas/motivation.md` — Microsoft Store + 海外展開対応

---

**変更履歴**:

- 2026-05-15: 初版制定 (4 分類 (A/B/C/D) + decision tree + dedup rule + anti-pattern)
- 2026-05-15: refined rule (= 認知負荷 boundary、 user 確定 5 分類)
- **2026-05-15: mechanical 3 基準で全面 refine** (= 「配置場所 table」 + 「文法構造 (述語/助詞)」 + 「文字数 tiebreaker (3 word / 25 char)」 で objective 判定、 「2 人が適用しても同じ答え」 を満たす)、 既 messages_ja.json 全 22 key を mechanical 基準で audit (= 整合性 verify 完了、 anti-pattern 該当 0 件)
