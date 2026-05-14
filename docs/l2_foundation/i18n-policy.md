# i18n Policy

> **目的**: hardcoded string を migration する時に **「英語 keep / 翻訳 / icon 化 / dedup」 を即決判断** できる rule + decision tree。
> **対象**: 全 frontend developer / agent / refactor 担当。
> **永続性**: design system の中核、 i18n 着手時の判定基準、 button-usage.md と並ぶ L2 design doc。
> **status**: 2026-05-15 制定 (= 既 merged i18n PR #456-#464 の audit と同時)。
> **背景**: motivation.md (= JP-only → Microsoft Store + 海外展開対応 update 済) で i18n architecture 確定、 ただし「英語のまま OK」 「過剰翻訳」 「dedup 漏れ」 「中途半端な英語残し」 が起きやすい。 構造的に防ぐため本 doc を明文化。

---

## 1. 4 分類 + decision tree

### 判定 question (= この文字列、 どう扱う?)

```
hardcoded string を見たら →
│
├─ universal な技術 fact (brand / 技術略語 / hotkey / file ext / version / file 名)
│   → (A) literal keep
│      = i18n を通さない、 hardcoded のまま
│
├─ UI 表示の universal な英語語 (= 既英語 UI label、 future も英語維持決定)
│   → (B) ja===en key 化
│      = messages_{ja,en}.json で同 value、 翻訳 work 0 だが key 化で経路一貫
│
├─ universal recognition の操作 (close × / settings ⚙ / search 🔍 / 表示切替 等)
│   → (D) icon-only 化
│      = visible text 撤去、 `<Button size="icon">` + `aria-label={t('common.X')}` のみ
│
└─ app 固有概念 / 説明 / error / form label / 選択肢 / toast 等
    → (C) 翻訳対象 t() 化
       = messages_ja.json に key 追加、 messages_en.json で英訳
```

---

## 2. 各分類の判定 rule

### (A) literal keep (= i18n を通さない)

**該当**:

- **brand 名**: `Arcagate` / `Steam` / `GitHub` / `VS Code` / `Tauri` / `Svelte` / `Microsoft Store` / `Epic Games` 等
- **技術略語**: `CPU` / `RAM` / `GPU` / `OS` / `API` / `JSON` / `SQL` / `URL` / `UUID` / `HTTP` 等
- **hotkey 表示**: `Ctrl+Shift+Space` / `Ctrl+Z` / `Ctrl+0` / `Esc` / `Del` / `Tab` / `Space+drag` 等
- **file 拡張子**: `.exe` / `.md` / `.json` / `.bat` / `.png` / `.svg` 等
- **file 名**: `README.md` / `package.json` / `Cargo.toml` 等
- **バージョン / metadata**: `Version` / `License` / `MIT` / `v1.0.0` 等

**理由**: universal な技術 fact で localize する意味なし、 全 locale で英語表示が natural、 user 体験は brand / 技術用語の英語維持が一般的。

**実装**: hardcoded literal のまま、 messages_ja.json にも入れない、 lint (audit-i18n-hardcode.sh) は **これらを除外する pattern を入れる** (= 翻訳漏れ誤検出を防ぐ)。

### (B) ja===en key 化 (= 翻訳 work 0、 経路一貫)

**該当**:

- UI 文脈で **「現状英語表示、 future も英語維持決定」** のもの
- 例: `Library` / `Workspace` (nav tab label)、 `Desktop Overlay Palette` (palette title)、 `Open with…` (= macOS 慣習尊重の英語表記)、 `English` (locale 選択 option label)

**理由**: i18n の経路は通すが翻訳 work は 0 (= ja===en)、 future の locale 追加時 fallback chain 一貫、 「なんとなく英語のまま」 を **明示的に**「英語維持 (= 意図的)」 と marker。

**実装**: messages_ja.json + messages_en.json で **同 value** で key 化、 `t('nav.library')` 経由で参照。

### (C) 翻訳対象 (= 通常の i18n、 ja → en 翻訳必要)

**該当**:

- **UI label**: 「保存」 「キャンセル」 「ライブラリが空です」 等の操作 / 状態表示
- **説明文**: 「アプリ・フォルダ・URL などのショートカットを追加できます」 等
- **error / toast**: 「保存に失敗しました」 「読み込み中エラー」 等
- **form label**: 「タイトル」 「説明 (任意)」 「タグ名」 等
- **選択肢 label**: 「フラット ダーク」 「組み込み」 等

**理由**: app 固有 / 操作意図 / state 表示等、 user の言語で表現すべきもの。

**実装**: `t('area.sub.name')` で migration、 messages_ja.json + messages_en.json で別 value。 **dedup 厳守** (= 後述 §3)。

### (D) icon-only 化 (= text 撤去、 aria-label のみ翻訳対象)

**該当 (= button-usage.md rubric (e) icon-only と整合)**:

- **close** (×、 `X` icon)
- **settings** (⚙、 `Settings` icon)
- **search / search clear** (🔍 / × in search box)
- **add / new** (+、 `Plus` icon、 context あり時)
- **delete / trash** (🗑、 `Trash2` icon)
- **edit** (✏、 `Pencil` icon)
- **copy** (📋、 `Copy` icon)
- **more / overflow** (... 、 `MoreHorizontal` icon)
- **expand / collapse** (▼▲、 `ChevronUp/Down` icon)
- **view mode toggle** (grid ▦ / list ☰、 `Grid3x3` / `LayoutList` icon)
- **back / next** (← →、 `ChevronLeft/Right` icon)
- **refresh / reload** (🔄、 `RefreshCw` icon)
- **external link** (↗、 `ExternalLink` icon)
- **undo** (↩、 `Undo2` icon)

**理由**: universal recognition で text なしでも操作意図伝達可能、 visible text 削減 = 視覚 noise 削減 + 翻訳 work 削減。

**実装**: `<Button variant="ghost" size="icon">` + icon component + `aria-label={t('common.X')}` (= visible text 撤去、 a11y のみ翻訳)。

---

## 3. dedup rule (= common.* namespace)

### 判定: **2 箇所以上で同一文言** → `common.*` に昇格

- `common.cancel` (= 「キャンセル」 が 3+ file で使用)
- `common.save` / `common.delete` / `common.close` / `common.edit` / `common.change` / `common.add` / `common.back` / `common.next` / `common.loading` / etc.

### area-specific namespace は **その画面固有** のみ

- `library.empty_title` (= Library 画面でのみ表示)
- `palette.no_recent` (= palette でのみ)
- `settings.hotkey.label` (= settings でのみ)

### 重複検知 lint

PR review 時に **既 messages_ja.json に同 value (= 同 JP 文言) を別 key で追加してないか** grep audit。

---

## 4. Decision Tree (= 即決 flow)

```
1. これ literal な技術 fact / brand / hotkey / file ext / version か?
   YES → (A) literal keep、 i18n 通さない
   NO  → 次
2. universal recognition の操作 icon が存在するか?
   YES → (D) icon-only 化、 visible text 撤去、 aria-label={t('common.X')}
   NO  → 次
3. UI 文脈で英語維持決定したものか?
   YES → (B) ja===en で key 化 (= messages_{ja,en}.json 同 value)
   NO  → 次
4. 2 箇所以上で同 JP 文言が出るか?
   YES → (C) 翻訳対象、 `t('common.X')` に dedup 集約
   NO  → (C) 翻訳対象、 `t('<area>.sub.name')` に area-specific key
```

---

## 5. Anti-pattern (= 「中途半端な英語残し」 を構造的に防ぐ)

### ❌ NG patterns

1. **「なんとなく英語のまま」** = 明確 category (A/B) で説明できない英語 hardcoded
   - 例: 何の根拠もなく「Loading...」 残してる (= (C) で `t('common.loading')` 化すべき)
2. **過剰翻訳** = 本来 (A) literal keep すべき brand / 技術略語を t() 化
   - 例: `t('app.cpu_label')` = "CPU" (= literal 「CPU」 keep が natural)
3. **dedup 漏れ** = 同 JP 文言を area-specific key で個別作成
   - 例: `library.cancel` + `workspace.cancel` + `settings.cancel` = 全部 `common.cancel` に集約すべき
4. **icon 化漏れ** = universal icon あるのに text-only button のまま
   - 例: ✕ close button に visible 「閉じる」 text + `t('common.close')` (= icon-only `aria-label={t('common.close')}` が正)
5. **混在中途半端** = 同 area / 同 widget 内で一部翻訳、 一部英語残しで不整合
   - 例: nav tab で 「Library」 (英語 keep) + 「設定」 (JP) + 「Workspace」 (英語) + 「ヘルプ」 (JP) → 4 件全部統一する (全英語 or 全 JP) か (B) ja===en で 経路一貫化

### ✅ Good patterns

- 各 hardcoded string に **明確な category 判定根拠** がある
- area / 同 component 内で **category 一貫** (= 全 JP / 全英語 / 全 icon 等の方針が見える)
- dedup で **真の messages_ja.json key 数を最小化** (= ~150-200 key)

---

## 6. 現 messages_ja.json structure review (2026-05-15 audit)

### 問題: nav 内で英語 / JP 混在

```json
"nav": {
  "library": "Library",       // (B) ja===en、 英語 keep 意図
  "workspace": "Workspace",   // (B) 同上
  "settings": "設定",          // (C) JP 翻訳
  "help": "ヘルプ"            // (C) JP 翻訳
}
```

**判定**: 4 件全部 (B) ja===en または全部 (C) 翻訳 で統一すべき。 現状の 2:2 混在は **anti-pattern §5 「混在中途半端」 該当**。

**是正方針 (推奨)**: **全 (B) ja===en**、 = 「Library / Workspace / Settings / Help」 で全英語統一 (= brand decision、 Microsoft Store + 海外展開で英語 fluent が前提)。 ただし user 体感 / 既存 UI の慣性を考慮し、 user に最終判断委ねる:

- **option 1: 全英語** (= "Library" / "Workspace" / "Settings" / "Help")
- **option 2: 全 JP** (= "ライブラリ" / "ワークスペース" / "設定" / "ヘルプ")
- **option 3: nav は brand decision として全 (A) literal keep** (= i18n 通さない、 全英語固定)

### その他の現 messages_ja.json key audit

| key                                       | value      | category                  | 整合性          |
| ----------------------------------------- | ---------- | ------------------------- | --------------- |
| `app.name`                                | "Arcagate" | (A) literal だが key 化済 | OK (brand keep) |
| `nav.library` / `nav.workspace`           | English    | (B) ja===en               | 上記参照        |
| `nav.settings` / `nav.help`               | JP         | (C) 翻訳                  | 上記参照        |
| `common.*` (cancel/save/...)              | JP         | (C) 翻訳 dedup            | OK              |
| `library.*` / `workspace.*` / `palette.*` | JP         | (C) 翻訳 area-specific    | OK              |
| `settings.hotkey.*`                       | JP         | (C) area-specific         | OK              |
| `dialog.confirm_delete` 等                | JP         | (C) 翻訳                  | OK              |
| `toast.saved/deleted/error`               | JP         | (C) 翻訳                  | OK              |

### 既 merged PR #456-#464 audit 結果

- ✅ **dedup**: common.* に 11 key 集約、 area-specific key 重複なし
- ⚠️ **混在中途半端**: nav の 2:2 英語/JP 混在は anti-pattern §5
- ✅ **literal keep**: brand / 技術略語 (CPU 等) は messages_ja.json に入ってない (= 正)
- ✅ **icon 化**: 既 PR では icon 化対象なし (= icon 化 audit は本 policy 制定後の rank 11 統合 PR で実施)
- ⚠️ **過剰翻訳**: なし (= app.name = "Arcagate" は key 化済だが (B) ja===en で OK)

---

## 7. 是正 action (= 本 policy 制定後の audit 結果)

| # | issue                                                                                                                                     | 是正                                                                  |
| - | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 1 | nav 4 key の英語 / JP 混在                                                                                                                | 続 PR で **全 (B) ja===en 統一** (option 1: 全英語) — user 確認後実施 |
| 2 | `messages_ja.json` $comment を policy 参照に update                                                                                       | 本 PR で                                                              |
| 3 | audit-i18n-hardcode.sh script に **(A) literal keep 除外 pattern** 追加 (= brand / 技術略語 / hotkey / file ext を翻訳漏れ誤検出から除外) | 別 PR (= script 拡張、 後続)                                          |

---

## 8. 適用 procedure (= 続 PR で守る flow)

1. **hardcoded string を見たら** §4 decision tree で判定
2. **PR description で category 明示**: 「(A) literal keep: N 件 / (B) ja===en: M 件 / (C) 翻訳: K 件 / (D) icon 化: L 件」
3. **(C) 翻訳で `messages_ja.json` 追加時**, dedup audit (= 既存 key に同 value あれば集約)
4. **(D) icon 化で button 変更時**, button-usage.md rubric §2-3 と整合
5. **review**: 「§5 anti-pattern 該当ないか」 を self-check
6. lint pass: `audit-i18n-hardcode.sh` budget within (= 不要な hardcoded が増えてない)

---

## 9. 参照

- `src/lib/i18n.svelte.ts` — i18n infrastructure (= `t(key)` / `setLocale()` / `detectOsLocale()`)
- `src/lib/i18n/messages_ja.json` — ja messages (本 doc rule で構造化)
- `src/lib/i18n/messages_en.json` — en messages (Phase 3 後半で整備)
- `scripts/audit-i18n-hardcode.sh` — hardcoded JP budget gate (lefthook pre-commit)
- `docs/l2_foundation/button-usage.md` — button rubric (= icon-only 化判定と整合)
- `docs/l0_ideas/motivation.md` (2026-05-14 update) — Microsoft Store + 海外展開対応 (= i18n 着手 driver)
- `E:/tmp/arcagate-refactor-audit-2026-05-13.md` — i18n Phase 1-5 plan

---

**変更履歴**:

- 2026-05-15: 初版制定 (audit 進行中の 「中途半端な英語残し」 問題を構造的に防ぐため)、 4 分類 (A/B/C/D) + decision tree + dedup rule + anti-pattern 明文化、 既 merged PR #456-#464 audit 結果 + 是正 action 記録
