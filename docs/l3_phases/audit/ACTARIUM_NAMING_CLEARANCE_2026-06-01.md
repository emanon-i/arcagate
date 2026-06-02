# Actarium 命名最終クリアランス audit (2026-06-01)

Arcagate のリブランド候補「Actarium」 を lock-in する前の最終クリアランス。
WebFetch / WebSearch + 公開 WHOIS / package registry / GitHub API を直接照会
した結果。 実装はしない、 調査と判定のみ。

## 結論先出し: **⚠ 条件付き GO (に近いが、 critical な reputation risk あり)**

- ✓ Etymology は文法的にクリーン、 既存 Latin 語彙ではない造語
- ✓ Package / SNS / 多数の domain TLD は空き、 ブランド構築の **技術的下地はある**
- ⚠ ただし `actarium.com` は **HYIP crypto scam 詐欺会社の旧 owner** が保有しており、 SEO 上で詐欺 review (Trustpilot / hyipinvestors 等) が 1 ページ目を支配
- ⚠ 日本語 SERP は **解散済声優ユニット「アクタリウム」** が支配
- ❓ 商標 (USPTO 2 件 hit、 WIPO 1 件 J-record) は **JS-heavy DB で agent 取得不能 → 弁理士による正式 clearance 必須**
- ⚠ GitHub org `@Actarium` は 2014 取得済 dormant (移譲不能の可能性)

**結論**: 技術的下地はあるが、 launcher ブランドが詐欺 HYIP の SERP 残骸と SEO で衝突する critical risk が残る。 採用するなら (a) `actarium.com` 取得交渉 + (b) 弁理士商標 clearance + (c) GitHub org 代替 (`actarium-app` 等) を併せて lock-in する条件付き GO。

---

## A. 意味論検証 (semantic validation)

### A.1 etymology 事実確認 — ✓ GO

| 要素                  | 結果                                                                                       | source                                                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Latin `acta`          | 動詞 `agō` 過去分詞中性複数 → "things that have been done" = 行為 / 公文書 / 議事録 / 新聞 | [Wiktionary](https://en.wiktionary.org/wiki/acta) / [Merriam-Webster](https://www.merriam-webster.com/dictionary/acta)    |
| 接尾辞 `-arium`       | nouns of purpose (場所 / 用具)。 `aquarium` / `planetarium` / `terrarium` / `vivarium` 等  | [Wiktionary -arium](https://en.wiktionary.org/wiki/-arium)                                                                |
| `Actarium` 単独 entry | **古典 Latin に existing vocabulary として登録なし** (合成造語として自由に使える)          | [Latin-dictionary.net "no definitions"](https://latin-dictionary.net/search/latin/actarium)                               |
| 関連語 `actarius`     | 古典 Latin 語: officer / clerk / military steward (実在語、 親戚)                          | [Latin-is-simple](https://www.latin-is-simple.com/en/vocabulary/noun/718/)                                                |
| Roman 法律含意        | `acta diurna` (BC 131〜、 daily public acts)、 `acta senatus` (BC 59〜、 元老院議事録)     | [Wikipedia: Acta Diurna](https://en.wikipedia.org/wiki/Acta_Diurna) / [Britannica](https://www.britannica.com/topic/Acta) |

判定: 文法的・語源的に **正当な造語**。 古典 Latin に既存 entry なく自由に意味割当て可能。

### A.2 v1+v2 fit 検証 — ⚠ Caution

| 観点                                                                | 評価                                                                                                                                                                                  |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `-arium` = personal space 比喩 → launcher (v1) に乗るか             | △ `aquarium` / `terrarium` 等は **生き物・植物の容器** が支配的 connotation。 「digital launcher」 への metaphorical leap は必要だが、 atrium 等 abstract 空間例もあり許容範囲 (推測) |
| `acta` = records / proceedings → ActivityWatch 系記録 (v2) に乗るか | ✓ `acta diurna` (daily acts の記録) は v2 ユースケースに直結。 fit 良好                                                                                                               |
| 合成意味 "place where daily acts are kept"                          | v1 (= daily acts を起こす場所) + v2 (= acts の記録場所) を **1 語で包摂可能**                                                                                                         |
| 一般人の「acta」連想                                                | "minutes of meeting / 議事録 / 公文書" が首位。 Spanish `acta` も同様 (出生・婚姻・死亡証明書)。 ⚠ **「議事録ツール」 連想は強い**                                                    |
| Romance/Slavic 圏 users 視点                                        | Spanish `acta` / French `acte` / German `Akte` / Polish `akta` = 行為 / 法的文書。 **`Actarium` が「公文書館」 に読まれるリスク**                                                     |

判定: v2 fit 極めて良好、 v1 は metaphorical leap 必要だが致命的でなし。 「議事録ツール」 連想 + Romance/Slavic 圏での「公文書館」 含意があり ⚠。

### A.3 negative meaning / cultural pitfall — ⚠ Caution (critical な scam ghost あり)

| 言語                      | 結果                                                                               | source                                                                                              |
| ------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 英 Urban Dictionary       | `actarium` entry なし (404) ✓                                                      | [urbandictionary.com](https://www.urbandictionary.com/define.php?term=actarium)                     |
| 日本語                    | 「アクタリウム」 = 声優ユニット (姫イド隊改名、 2019-2025、 2025-10-19 解散) ⚠     | [actarium.bitfan.id](https://actarium.bitfan.id/) / [X @actarium_info](https://x.com/actarium_info) |
| Spanish                   | `acta` = 議事録 / 公文書、 卑語含意なし ✓、 ただし「公文書館」 読まれ ⚠            | [SpanishDict](https://www.spanishdict.com/translate/acta)                                           |
| French / German / Italian | `acte` / `Akte` / `atto` = 行為 / 法的書類、 卑語含意なし ✓                        | (各言語 Wiktionary)                                                                                 |
| 中国語 / 韓国語           | `acta` 直接対応の卑語 / vulgar は検索範囲で発見されず ✓ (推測、 native check 推奨) |                                                                                                     |

**critical な既存ブランド衝突**:

| 名称                                                                                                                           | 状況                                                                                                                                                                                                                                                                                                          | リスク                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **UK ACTARIUM LTD** (Companies House [#14393999](https://find-and-update.company-information.service.gov.uk/company/14393999)) | 2022-10-03 設立 → **2024-03-12 dissolved**。 SIC 70221 = 金融管理。 実態: **HYIP/crypto scam**。 [invest-tracing](https://invest-tracing.com/mobile/detail-ACTARIUM.html) / [hyipfinance](https://hyipfinance.com/actarium/) / [hyipinvestors](https://hyipinvestors.org/actarium/) で scam 認定 (2022-12-09) | **✗✗ critical**。 actarium 検索で詐欺 HYIP review が SERP 上位を占有。 dissolved 済だがゴーストとして残存 |
| 声優ユニット「アクタリウム」                                                                                                   | 2019-03-12 始動、 2025-10-19 解散                                                                                                                                                                                                                                                                             | ⚠ 日本語 SERP 占有。 fan archive 残存 (X / Bitfan / BASE / TuneCore / fan jimdo site)                     |
| 旧 Actarium meeting minutes platform ([Daiech/Actarium](https://github.com/Daiech/Actarium))                                   | 2019 last update、 GitHub 個人 repo                                                                                                                                                                                                                                                                           | ✓ 影響軽微 (個人 archive)                                                                                 |
| Actaria / Acta Holdings BV / ACTA Holdings Ltd / Actua Corp (ACTA ticker)                                                      | `acta-` prefix cluster、 別業種                                                                                                                                                                                                                                                                               | ⚠ 軽度 (substring 重複のみ)                                                                               |

判定: 単言語 native check の範囲で卑語 / 性的含意なし ✓、 **しかし HYIP scam ゴースト** は技術中立的に critical な reputation risk ✗。

---

## B. 商標 (trademark) — ❓ 手動確認必須 (agent 範囲で確定不能)

| DB                                                                | 結果                                                                                                                                                                                                                                                                                          | 判定                                         |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| **J-PlatPat (日本)** ([URL](https://www.j-platpat.inpit.go.jp/))  | SPA / JS-heavy で agent 直接取得不能。 Google `site:j-platpat.inpit.go.jp` indirect 検索で hit ゼロ                                                                                                                                                                                           | ❓ 手動確認推奨                              |
| **USPTO (米)** ([URL](https://tmsearch.uspto.gov/))               | 新 tmsearch で `Actarium` query に 2 件 hit: [serial 99836522](https://tmsearch.uspto.gov/search/search-results/99836522) / [serial 98449797](https://tmsearch.uspto.gov/search/search-results/98449797)。 新 tmsearch は fuzzy / phonetic match を含むため exact match か近似か **確証なし** | ⚠ TSDR で要 follow-up                        |
| **EUIPO eSearch plus** ([URL](https://euipo.europa.eu/eSearch/))  | SPA、 agent 直接取得不能。 indirect 検索で関連 trademark record の hit ゼロ                                                                                                                                                                                                                   | ❓ 手動確認推奨 (推定 ✓)                     |
| **WIPO Global Brand Database** ([URL](https://branddb.wipo.int/)) | Altcha CAPTCHA で gate。 Google site: 検索で 1 件 hit: [`IDTM.J002011023027`](https://branddb.wipo.int/branddb/id/en/showData.jsp?ID=IDTM.J002011023027) (`IDTM.J` prefix = 日本由来 record)。 class 詳細 不明                                                                                | ⚠ class 41 (娯楽) なら ✓、 class 9/42 なら ✗ |
| **UK IPO** ([URL](https://trademarks.ipo.gov.uk/))                | indirect 検索で `Actarium` trademark record の hit ゼロ                                                                                                                                                                                                                                       | ❓ 手動確認推奨 (推定 ✓)                     |

**software 関連 class** (= 本 app の主要 class):

- Class 9: downloadable software (Tauri desktop app primary)
- Class 42: SaaS / software services (secondary)

参照: [USPTO 分類ガイド](https://www.uspto.gov/web/offices/com/sol/notices/class.html) / [Skala](https://www.skala.io/blog/understanding-classes-9-and-42-for-software-companies) / [EUIPO Guidelines 5.10.5](https://guidelines.euipo.europa.eu/1803468/1788464/trade-mark-guidelines/5-10-5-computers-and-software-class%C2%A09-versus-computer-programming-class%C2%A042-)

判定: agent 調査範囲で **software class (9/42) の active registered trademark は確認できなかった**。 ただし USPTO 2 件 + WIPO 1 件は class / mark 詳細未確認。 **正式 GO 判断には弁理士による clearance search が必須**。

---

## C. domain 空き状況 — ⚠ MIXED (主要 .com 取得済 + 良 alt あり)

| domain           | 状態                                                                                                                                                | source |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| **actarium.com** | ✗ **取得済** (2022-09-28 / NameCheap / 2027-09-28 expiry / registrant non-public、 旧 HYIP scam の元 owner)                                         | who.is |
| actarium.dev     | ✓ 空き                                                                                                                                              | who.is |
| actarium.app     | ✓ 空き                                                                                                                                              | who.is |
| actarium.io      | ✓ 空き                                                                                                                                              | who.is |
| actarium.ai      | ✓ 空き                                                                                                                                              | who.is |
| **actarium.net** | ⚠ **取得済** (2026-01-04 / GMO Internet 日本 registrar / 2027-01-04 expiry / 5 ヶ月前に新規取得 = 解散済声優ユニット fans / 別主体 の可能性、 推測) | who.is |
| actarium.org     | ✓ 空き                                                                                                                                              | who.is |
| getactarium.com  | ✓ 空き                                                                                                                                              | who.is |
| useactarium.com  | ✓ 空き                                                                                                                                              | who.is |

判定: 主要 `.com` は 詐欺会社の元 owner に取得済で 2027 まで保有。 `.net` は 5 ヶ月前 (2026-01) に第三者が日本 registrar (GMO) で取得 = 詳細不明、 声優ユニット fans 系の可能性。 一方で `.dev` / `.app` / `.io` / `.ai` / `.org` / `getactarium.com` / `useactarium.com` は **全て空き** = 代替 TLD で実用上 OK。 ただし `.com` は SEO + 信頼性で長期的に critical。

---

## D. パッケージ / 開発インフラ — ✓ ほぼ GO (GitHub org 1 件のみ取得済 dormant)

| registry                           | 状態                                                                                                                                                                                                                                                                                         | source                                             |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| npm                                | ✓ 空き (404)                                                                                                                                                                                                                                                                                 | https://registry.npmjs.org/actarium                |
| crates.io                          | ✓ 空き (404)                                                                                                                                                                                                                                                                                 | https://crates.io/api/v1/crates/actarium           |
| PyPI                               | ✓ 空き (404)                                                                                                                                                                                                                                                                                 | https://pypi.org/pypi/actarium/json                |
| Homebrew formula                   | ✓ 空き (404)                                                                                                                                                                                                                                                                                 | https://formulae.brew.sh/api/formula/actarium.json |
| winget-pkgs                        | ✓ 空き (`microsoft/winget-pkgs` repo code search で hit ゼロ)                                                                                                                                                                                                                                | (gh code search)                                   |
| **GitHub user/org `@Actarium`**    | ⚠ **取得済** (Organization、 2014-03-26 created、 0 public repos / 0 followers / dormant 12 年)。 移譲リクエスト不可能性高い (推測)                                                                                                                                                          | [github.com/Actarium](https://github.com/Actarium) |
| GitHub repos containing "actarium" | 3 件、 全て影響軽微: [rodrigoliz1/Actarium](https://github.com/rodrigoliz1/Actarium) (2026-05、 0 stars) / [Daiech/Actarium](https://github.com/Daiech/Actarium) (2019、 meeting minutes platform) / [JonathanMG7/actarium](https://github.com/JonathanMG7/actarium) (2014、 front-end repo) | (gh search)                                        |

判定: 主要 package registry は **全て空き** = ブランドの技術下地は確保可能。 GitHub `@Actarium` org のみ dormant 取得済で、 代替 (`actarium-app` / `actarium-dev` / `useactarium` 等) を採用する必要あり。

---

## E. SNS handles — ✓ ほぼ GO (X exact未確認)

| platform                       | 状態                                                                                                                                      | source                                                                                  |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **X (旧 Twitter) `@actarium`** | ⚠ X 直 fetch 402 (paywall)。 Google site:検索で **exact `@actarium` の hit なし** = 推定空き。 ただし `@actarium_info` は声優ユニット公式 | [@actarium_info](https://x.com/actarium_info) / [Google search](https://x.com/actarium) |
| GitHub `@actarium`             | ✗ 取得済 (D 参照)                                                                                                                         | (gh api)                                                                                |
| BlueSky `actarium.bsky.social` | ❓ WebFetch 曖昧 (handle 言及はあるが profile 詳細不明)、 手動確認推奨                                                                    | https://bsky.app/profile/actarium.bsky.social                                           |
| Threads `@actarium`            | ❓ Threads は auth-walled で agent 確認不能、 手動確認推奨                                                                                | https://www.threads.com/@actarium                                                       |
| Mastodon                       | (instance 多数で網羅不能、 主要 instance のみ手動確認推奨)                                                                                |                                                                                         |

判定: X `@actarium` は exact match 検索で hit なし = 推定空き ✓。 BlueSky / Threads / Mastodon は agent 範囲で確定不能 ❓。 GitHub は ✗ (D で記述、 代替 handle 採用要)。

---

## F. SEO / discoverability — ⚠ to ✗ (詐欺 ghost + 声優ユニットが SERP 支配)

### F.1 英語 SERP `actarium`

観測した上位 (Google + indirect 検索):

1. **X @actarium_info** — 声優ユニット公式
2. **GitHub JonathanMG7/actarium** — 個人 repo
3. **invest-tracing / hyipfinance / hyipinvestors / instant-monitor** — **HYIP 詐欺 review 多数** ✗
4. **Instagram @actarium** — 声優ユニット
5. **Trustpilot actarium.com** — HYIP scam reviews
6. **Facebook /Actarium/** — 声優ユニット
7. **actarium.com (redirect)** — 元 HYIP サイト

判定: 1 ページ目は **HYIP scam + 解散済声優ユニット** が支配。 launcher / dashboard / activity tracking 関連の hit は **皆無** = 新規参入の余地はある **が**、 ブランド検索した user が **詐欺 review に最初に当たる** ✗ critical risk

### F.2 日本語 SERP `アクタリウム`

1. actarium.bitfan.id (声優ユニット公式)
2. himeido-fan.jimdofree.com (fan site)
3. X @actarium_info
4. idoljournal.jp
5. TuneCore Japan / BASE shop / Rocket Base
6. actarium.base.shop (最終アルバム販売)

判定: **声優ユニット占有率ほぼ 100%** ⚠。 競合 launcher / 紛らわしいサービスはなしだが、 日本語ブランド浸透には「これ声優ユニットじゃないの?」 質問が常に発生する。

---

## 総合判定: ⚠ 条件付き GO

| 軸                   | 判定                                        |
| -------------------- | ------------------------------------------- |
| A.1 etymology        | ✓ GO                                        |
| A.2 v1+v2 fit        | ⚠ Caution (「議事録ツール」 連想注意)       |
| A.3 negative meaning | ⚠ Caution (卑語なし ✓、 声優ユニット衝突 ⚠) |
| A.3 既存ブランド衝突 | ✗ NO-GO 級 (HYIP scam ghost)                |
| B trademark          | ❓ 手動確認必須                             |
| C domain             | ⚠ MIXED (.com ✗ / .net ✗ / 他多数 ✓)        |
| D packages           | ✓ GO (GitHub org のみ ✗)                    |
| E SNS                | ✓ 推定 GO (一部 ❓)                         |
| F SEO 英語           | ✗ NO-GO 級 (scam 占有)                      |
| F SEO 日本語         | ⚠ Caution (声優ユニット占有)                |

### 推奨アクション (GO する場合の最低条件)

| # | アクション                                                                                                     | 必須度 |
| - | -------------------------------------------------------------------------------------------------------------- | ------ |
| 1 | **弁理士による正式商標 clearance** (USPTO 2 件 + WIPO 1 件 + J-PlatPat 区分 9/42 直接確認)                     | 必須   |
| 2 | **actarium.com 取得交渉** (現 owner は dissolved 会社で contact 困難の可能性、 brokerage 経由)                 | 推奨   |
| 3 | SEO 投資で SERP 1 ページ目奪還 (公式 site / GitHub org / Wikipedia / 早期 launch coverage)、 1 年がかり (推測) | 必須   |
| 4 | GitHub org 代替: `@actarium-app` / `@actarium-dev` / `@useactarium` 等を確保                                   | 必須   |
| 5 | 日本語表記を `Actarium` でアルファベット固定 (`アクタリウム` 公式表記は声優ファンと完全衝突)                   | 推奨   |
| 6 | crypto scam との visual differentiation (logo / tagline / `.app` 等で `.com` を当面避ける)                     | 推奨   |
| 7 | actarium.net 取得経路の確認 (5 ヶ月前 GMO 取得 = 日本 fans / 別主体、 採用前に把握)                            | 推奨   |
| 8 | BlueSky / Threads / Mastodon handle 手動 claim                                                                 | 推奨   |

### NO-GO 寄りに振れる場合の代替

- `Actaria` / `Actarion` / `Actarius` / `Actamarium` 等の派生綴り
- 別語根: Latin `agenda` (= "things to be done") / `opera` (= "works") / `gesta` (= "deeds") をベースに再造語
- もしくは current `Arcagate` 継続も視野 (本 audit は switch 前提だが、 SEO/scam ghost の重さによっては既存ブランド維持の合理性あり、 推測)

---

## 制約事項 (本 audit の限界)

- 商標 DB (J-PlatPat / EUIPO / WIPO BrandDB / UK IPO) は SPA / CAPTCHA gate で **agent 直接取得不能**。 indirect 検索 (Google site:) で補完したが、 正式 clearance には人手による DB 直接照会または弁理士委託が必要
- USPTO 2 件 hit (serial 99836522 / 98449797) は tmsearch の fuzzy / phonetic match を含むため exact match 確定には TSDR (https://tsdr.uspto.gov/) で個別照会必要
- WIPO `IDTM.J002011023027` の出願人 / class 詳細は branddb.wipo.int で要手動確認
- BlueSky / Threads / Mastodon の handle 確認は agent 範囲では曖昧
- 中国語 / 韓国語 native cultural check は範囲狭く、 native speaker review 推奨
- 規約遵守のため bash curl による DB 工夫取得は実施せず (WebFetch 失敗 = 「手動確認推奨」 として正直に記載)

## Sources (代表)

### A 意味論

- [Wiktionary: acta](https://en.wiktionary.org/wiki/acta) / [Wiktionary: -arium](https://en.wiktionary.org/wiki/-arium)
- [Merriam-Webster: acta](https://www.merriam-webster.com/dictionary/acta)
- [Latin-is-simple: actarius](https://www.latin-is-simple.com/en/vocabulary/noun/718/)
- [Wikipedia: Acta Diurna](https://en.wikipedia.org/wiki/Acta_Diurna) / [Britannica: Acta](https://www.britannica.com/topic/Acta)
- [SpanishDict: acta](https://www.spanishdict.com/translate/acta)

### A.3 既存ブランド衝突

- [Companies House: ACTARIUM LTD 14393999](https://find-and-update.company-information.service.gov.uk/company/14393999)
- [Invest-tracing: Scam-ACTARIUM](https://invest-tracing.com/mobile/detail-ACTARIUM.html)
- [HyipFinance: Actarium](https://hyipfinance.com/actarium/)
- [HYIP Investors: Actarium SCAM](https://hyipinvestors.org/actarium/)
- [アクタリウム公式 (Bitfan)](https://actarium.bitfan.id/) / [X @actarium_info](https://x.com/actarium_info)

### B 商標

- [USPTO tmsearch hit #1 (99836522)](https://tmsearch.uspto.gov/search/search-results/99836522)
- [USPTO tmsearch hit #2 (98449797)](https://tmsearch.uspto.gov/search/search-results/98449797)
- [WIPO record IDTM.J002011023027](https://branddb.wipo.int/branddb/id/en/showData.jsp?ID=IDTM.J002011023027)
- [J-PlatPat](https://www.j-platpat.inpit.go.jp/) (手動確認必須)
- [EUIPO eSearch plus](https://euipo.europa.eu/eSearch/) (手動確認必須)
- [UK IPO trademarks](https://trademarks.ipo.gov.uk/) (手動確認必須)

### F SEO

- (Google 検索結果、 個別 URL は A.3 / C と重複)
- [actarium.base.shop](https://actarium.base.shop/) / [TuneCore](https://www.tunecore.co.jp/artists?id=331134)
