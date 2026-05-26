# テーマ複製で source aesthetic が失われる — 根本分析 (2026-05-26)

対象: 「Library 設定の見た目テーマ画面で、 非デフォルトテーマ (brutalist-dark / neumorph
等) を選択中に『コピー』 / 『現在のテーマを複製』 ボタンを押しても、 複製された新テーマが
**source の見た目を再現せず default Dark / Light に化ける**」 という user 実機報告 (F3 系)
を、 これ以上対症療法を積まずに根治するための事実ベース分析。

経緯:

- F3 は PH-CF-800 (PR #566) で「cloneCurrentTheme バグ修正」 として一度修正済の扱い
  (= source 未解決時の silent fallback を撤去 + clone_source_missing toast)、 独立検証
  PR #569 で ✅ と report されていた。
- 本 audit はその後の user 実機検収で「**まだ選択中テーマがコピーされていない**」 と再報告
  されたことを受けた再調査。
- 解析時点 main HEAD = `2968a44c` (PR #579 マージ済)。
- 解析方法: 静的コードトレース + CDP 経由の **実機 dev 計測**。
- 本 audit はコード変更を一切含まない (docs 専用 PR)。

---

## TL;DR

1. **真因は frontend / backend どちらでもなく "schema convention" のミスマッチ**。 6 builtin
   theme は migration 041 で `themes.css_vars = '{}'` (空 JSON) で seed されており、 aesthetic
   look は `arcagate-theme.css` の `[data-theme='ID']` block (CSS) で定義されている。
2. `cloneTheme(sourceId)` は `themeStore.themes.find(...).css_vars` を **そのまま** 新 custom
   theme に copy するため、 builtin を source にすると **`'{}'` の空 cssVars** が複製される。
3. 新 custom は `data-theme=<uuid>` で active 化されるが、 CSS には `[data-theme='<uuid>']`
   block が無いため aesthetic primitives (blur / radius / surface-* / primary chroma 等) は
   **default Dark (`.dark` class) または Light (`:root`) にフォールバック**する。
4. user 視点は「brutalist-dark をコピーしたら default Dark に化けた」 = ② Library アイコン
   即時反映と同じ「`画面で目視確認` を経ずに『修正済』 と宣言した」 構造的ミス。
5. **PR #566 の e2e (TS-3 / TS-4) は UI ボタンを 1 回も click せず、 `cmd_create_theme` を
   直叩きして `source.css_vars` を渡し、 返ってくる `cloned.css_vars === source.css_vars` を
   assert するだけの "tautology"** であり、 user の真の困りごと (= 見た目が一致するか) を
   一切検証していない。 PR #570 LB-2 の合成 store hook 経路と完全に同類の落とし穴。
6. 修正方針案 3 案 + e2e 改修 1 案を §推奨で提示する。 本 audit は方向性のみで実装 PR は別。

---

## 用語整理

| 語                     | 指すもの                                                                                 |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| F3                     | 「テーマ複製」 機能 (PH-CF-800)                                                          |
| 「コピー」             | テーマカード下のボタン (`settings-theme-clone-<id>`、 `cloneTheme(sourceId)` を呼ぶ)     |
| 「現在のテーマを複製」 | header の Plus button (`settings-clone-current-theme`、 `cloneTheme(activeMode)`)        |
| seeds                  | `--c-bg` / `--c-fg` / `--c-primary` 等の color seeds (CSS layer 1)                       |
| primitives             | `--ag-radius-*` / `--surface-blur` / `--surface-noise-opacity` 等 aesthetic 軸 (layer 2) |
| semantic               | `--ag-surface-*` 等 component 直接参照層 (layer 3、 seeds + color-mix で auto-derive)    |

---

## 1. 実機証跡 (CDP measurement)

調査用 CDP attach (port 9222) で起動中 dev の `cmd_list_themes` / `cmd_set_active_theme_mode` /
`cmd_create_theme` / `cmd_delete_theme` を経由し、 cloneTheme と等価な複製を 3 source (`brutalist-dark`
/ `neumorph` / `brutalist`) で実行 → 複製後 active 化して `getComputedStyle(documentElement)` を
直接読んだ実値。 source baseline と clone after の **完全 diff**:

### brutalist-dark を複製 (base_theme = dark)

| CSS var            | source `[data-theme='brutalist-dark']`                | clone `data-theme=<uuid>`                                |
| ------------------ | ----------------------------------------------------- | -------------------------------------------------------- |
| `--c-bg`           | `oklch(0.14 0 0)` (純黒)                              | `oklch(0.17 0.013 260)` (default Dark の青みグレー)      |
| `--c-fg`           | `oklch(0.96 0 0)` (純白)                              | `oklch(0.96 0.004 250)` (default Dark の青み白)          |
| `--c-primary`      | `oklch(0.50 0.20 28)` (red-orange、 brutalist accent) | `oklch(0.50 0.14 215)` (default Dark の blue)            |
| `--surface-blur`   | `none` (brutalist は blur 無し)                       | `blur(16px) saturate(180%)` (default Dark の glass blur) |
| `--ag-radius-card` | `0px` (brutalist は角丸無し)                          | `22px` (default Dark の glass radius)                    |
| `--ag-surface-1`   | (source seeds 由来の派生値)                           | (default Dark seeds 由来の派生値)                        |
| `__dataTheme`      | `brutalist-dark`                                      | `<custom uuid>`                                          |
| `__darkClass`      | `true`                                                | `true`                                                   |

**6/6 サンプル変数すべて mismatch**。 brutalist-dark の特徴である「純黒 + red-orange accent +
角丸無し + blur 無し」 が **完全に失われ default Dark (glass) になっている**。

### neumorph (base_theme = light) を複製

| CSS var            | source `[data-theme='neumorph']`                      | clone `data-theme=<uuid>`                                |
| ------------------ | ----------------------------------------------------- | -------------------------------------------------------- |
| `--c-bg`           | `oklch(0.93 0.012 270)` (neumorph の少し暗めの light) | `oklch(0.985 0.003 250)` (default Light の純白)          |
| `--c-fg`           | `oklch(0.34 0.02 270)` (neumorph の muted dark text)  | `oklch(0.22 0.02 260)` (default Light の濃い text)       |
| `--c-primary`      | `oklch(0.50 0.10 280)` (neumorph の muted purple)     | `oklch(0.50 0.14 215)` (default Light の blue)           |
| `--surface-blur`   | `none`                                                | `blur(8px) saturate(160%)` (default Light の glass blur) |
| `--ag-radius-card` | `24px` (neumorph 特有の最大丸み)                      | `22px` (default Light)                                   |
| `__dataTheme`      | `neumorph`                                            | `<custom uuid>`                                          |
| `__darkClass`      | `false`                                               | `false`                                                  |

6/6 mismatch。 neumorph の「muted purple + 大きめ角丸」 が消えて default Light になる。

### brutalist (light) を複製

| CSS var            | source `[data-theme='brutalist']`            | clone `data-theme=<uuid>`                      |
| ------------------ | -------------------------------------------- | ---------------------------------------------- |
| `--c-bg`           | `oklch(0.99 0 0)` (純白)                     | `oklch(0.985 0.003 250)` (default Light)       |
| `--c-fg`           | `oklch(0.16 0 0)` (純黒)                     | `oklch(0.22 0.02 260)` (default Light)         |
| `--c-primary`      | `oklch(0.50 0.22 28)` (brutalist の鮮烈 red) | `oklch(0.50 0.14 215)` (default Light の blue) |
| `--surface-blur`   | `none`                                       | `blur(8px) saturate(160%)`                     |
| `--ag-radius-card` | `0px`                                        | `22px`                                         |

6/6 mismatch。

### 観察まとめ

- **全 6 builtin の `themes.css_vars` は `'{}'` (空 JSON)** — backend 経由で `cmd_list_themes` の
  返却を直接確認済。
- 複製で作られた custom も `css_vars='{}'` で DB に entry が作られる (= 空のまま copy された)。
- 複製を active 化すると `data-theme=<uuid>` が html に set されるが、 CSS には `[data-theme='<uuid>']`
  block が無い → aesthetic は `:root` (light default) または `.dark` (dark default) にフォールバック。

### CDP scripts (再現手順)

調査用スクリプトは作業 dir の `tmp/ts3-repro.mjs` / `tmp/ts3-repro2.mjs` に置いた (commit はしない、
追跡対象外)。 大筋:

1. `chromium.connectOverCDP('http://localhost:9222')` で起動中 dev に attach
2. `cmd_set_active_theme_mode` で source を active 化 → `getComputedStyle` で baseline 計測
3. UI の `cloneTheme` と等価: `themes.find(...).css_vars` をそのまま `cmd_create_theme` に渡す
4. 複製を active 化 → `getComputedStyle` を再計測 → diff
5. cleanup: 複製を `cmd_delete_theme` で削除、 active を元に戻す

---

## 2. 真因 (静的解析)

### 2.1 関係ファイル

| Layer   | File:line                                                                                                    | 内容                                                                                                                                                                                                 |
| ------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UI      | [`SettingsAppearancePane.svelte`](../../../src/lib/components/settings/SettingsAppearancePane.svelte):74-103 | `cloneTheme(sourceId)` 本体: `themes.find(...).css_vars` をそのまま `themeStore.createTheme(...)` に渡す                                                                                             |
| Store   | [`theme.svelte.ts`](../../../src/lib/state/theme.svelte.ts):157-173                                          | `createTheme(name, baseTheme, cssVars)` → `themeIpc.createTheme(name, baseTheme, cssVars)`                                                                                                           |
| Store   | [`theme.svelte.ts`](../../../src/lib/state/theme.svelte.ts):72-110                                           | `applyTheme()` — themes.find(activeMode).css_vars を JSON.parse して style.setProperty + `data-theme=活性ID`                                                                                         |
| Backend | [`theme_service.rs`](../../../src-tauri/src/services/theme_service.rs):72-95                                 | `create_theme` — input の css_vars (空 '{}') をそのまま DB に保存                                                                                                                                    |
| Backend | [`theme_repository.rs`](../../../src-tauri/src/repositories/theme_repository.rs):6-19                        | `INSERT INTO themes (id, name, base_theme, css_vars, is_builtin) VALUES (...)`                                                                                                                       |
| Schema  | [`migrations/041_theme_six_builtins.sql`](../../../src-tauri/migrations/041_theme_six_builtins.sql)          | builtin 6 本を `css_vars='{}'` で seed、 「look は CSS の `[data-theme]` block で定義」 と明記 (line 28)                                                                                             |
| CSS     | [`arcagate-theme.css`](../../../src/lib/styles/arcagate-theme.css):401, 440, 501, 544                        | `[data-theme='neumorph']` / `[data-theme='brutalist']` / `[data-theme='neumorph-dark']` / `[data-theme='brutalist-dark']` block。 dark / light は `[data-theme]` を使わず `.dark` class の有無で切替 |

### 2.2 「look は CSS、 schema は空」 convention の盲点

migration 041 のコメント (line 28-29):

```sql
-- 3. Dark variant 2 本を新規追加 (look は arcagate-theme.css の [data-theme] block で定義、
--    css_vars は空 '{}' で良い — migration 035 と同方針)。
```

この設計は **builtin theme の look が CSS で固定される前提なら合理的** だが、 「**user が builtin
を source として custom theme を派生させる**」 ユースケース (= 複製) を考慮していない。 結果:

- builtin: `data-theme='brutalist-dark'` が `[data-theme='brutalist-dark']` CSS block にマッチ
  → aesthetic 適用
- builtin の複製 (custom): `data-theme='<uuid>'` だが `[data-theme='<uuid>']` block 無し
  → CSS-side aesthetic は何も effect しない → cssVars 空 → 結果 `:root` + `.dark` の default

つまり「複製」 という操作の semantic は「source の look を新しい id で持ち直す」 である一方、
schema convention は「look は CSS、 schema は空 placeholder」 で、 **両者の前提が衝突している**。

### 2.3 PR #566 F3 fix が直したこと / 直していないこと

PR #566 commit body の F3 説明:

> F3 (cloneCurrentTheme バグ修正): ソース未解決時に `cssVars='{}'` のデフォルト複製へ
> 黙ってフォールバックする実装を撤去。

これは「**`themes.find(...)` が undefined を返す edge case で silent に default に化ける**」
回避策。 [SettingsAppearancePane.svelte:78-82](../../../src/lib/components/settings/SettingsAppearancePane.svelte) で
`source` が見つからなければ toast でエラー return、 button は `canCloneCurrent` で disable、 など。

しかし **source が見つかる正常ケース** (= 6 builtin はいずれも `themes` 配列に必ず存在する) で
`source.css_vars = '{}'` を渡してしまう問題はそのまま残っている。 F3 fix は「sourceなし」 を
潰したが、 「**source.css_vars が空という builtin schema 上の隠し穴**」 は潰せていない。

---

## 3. TS-3 / TS-4 e2e は完全な空転 (PR #570 LB-2 と同類)

### 3.1 TS-3 の assertion 構造

[`ph-cf-800-theme-settings.spec.ts:114-144`](../../../tests/e2e/ph-cf-800-theme-settings.spec.ts):

```ts
test('TS-3 (F3): 現在テーマ複製は active の css_vars を厳密に複製する', async ({ page }) => {
  const uniqueVars = `{"--ag-accent":"#0f0f0f","--ph-cf-800-marker":"${Date.now()}"}`;
  const source = await createTheme(page, ..., 'dark', uniqueVars);   // ← non-empty css_vars
  await setActiveThemeMode(page, source.id);
  const cloned = await createTheme(page, ..., source.base_theme, source.css_vars);
  expect(cloned.css_vars).toBe(uniqueVars);                          // ← tautology
});
```

問題点 (4 点):

1. **UI の「コピー」 / 「現在のテーマを複製」 ボタンを 1 回も click していない**。 `createTheme` を
   `cmd_create_theme` 経由で直叩きしているだけ。 `SettingsAppearancePane.svelte` の `cloneTheme()` /
   `cloneCurrentTheme()` 関数を通っていない。
2. **`themeStore.themes.find(...)` 経由の source 解決を踏まない**。 PR #566 F3 fix 自体の
   (`silent fallback` 撤去) 経路を一切実行しない。
3. **source として builtin を使っていない**。 e2e 内で create した non-empty cssVars の custom を
   source にしているため、 **空 cssVars 複製の bug シナリオが構造的に出ない**。
4. **assertion が tautology**: `source.css_vars` を渡して `cmd_create_theme` に投げ、 返って
   くる新 row の `css_vars` が同じ文字列であることをチェックしているだけ。 渡したものが
   返ってくる、 という DB の自明な性質しか verify していない (= **見た目が一致するか / source
   aesthetic が再現するか は一切検証していない**)。

### 3.2 TS-4 も同じ穴

[`ph-cf-800-theme-settings.spec.ts:146-197`](../../../tests/e2e/ph-cf-800-theme-settings.spec.ts):

- 行 178-185: 真に builtin `dark` の `css_vars` を source にしている (= `'{}'`)
- 行 188: `afterCount === beforeCount + 1` (DB row +1) しか assert していない
- **新 custom が dark の見た目を再現するかは検証していない**

幸い builtin `dark` の場合は base_theme = 'dark' で `.dark` class が effect する都合上、 見た目が
default Dark とほぼ同じになるため bug が表面化しにくい。 だが brutalist-dark 等の non-default
variant では確実に問題化する。

### 3.3 user 報告と PR #569「✅ 確認」 の乖離理由

PR #569 (= PH-CF 系の独立検証 report) は「TS-3 が e2e で green」 を根拠に F3 を ✅ 扱いに
してしまった。 だが TS-3 が空転しているため、 e2e green は user の困りごと (= 見た目化け)
を保証しない。 これは **PH-CF-1100 ② で発覚した「合成 store hook 経路で test pass、 実機で
壊れている」 と完全に同型の構造的失敗**。

`memory/feedback_subagent_proof_pass.md` の教訓「sub-agent 出力は実コード再 verify」 と並ぶ
形で、 「**e2e の合成経路は実 UI 経路で再検証必須**」 (= LB-2 で出した PR #576 の方針) を
全 e2e 横断 audit gate にすべき可能性が浮上 (= §推奨 §C 横展開)。

---

## 4. 修正方針案 (実装 PR は別建て)

### A 案 — builtin の `css_vars` を「実値」 で seed (推奨、 schema 寄り根治)

migration で 6 builtin の `themes.css_vars` を空 `'{}'` から **CSS `[data-theme='ID']` /
`.dark` / `:root` block と等価の JSON** に書き換える。 例 brutalist-dark:

```json
{
  "--c-bg": "oklch(0.14 0 0)",
  "--c-fg": "oklch(0.96 0 0)",
  "--c-primary": "oklch(0.50 0.20 28)",
  "--surface-blur": "none",
  "--ag-radius-card": "0px",
  ...
}
```

派生層 (`--ag-surface-*` 等 color-mix / oklch from 系) は seeds から自動再計算されるため
JSON 化対象は **layer 1 seeds + layer 2 primitives** のみで十分。

利点:

- `cloneTheme(sourceId)` は **何も変えずに正しく動く** (source.css_vars が non-empty な実値に
  なるので、 新 custom も同じ look を持つ)。
- `applyTheme()` (theme.svelte.ts:72-110) は既に「css_vars を JSON.parse して setProperty +
  data-theme=ID」 する設計のため、 builtin 自身の見た目も load 経路で再現できる。
- 将来 CSS `[data-theme='brutalist-dark']` block を撤去できる (= CSS と DB の 2 重定義を解消、
  single source of truth へ)。

trade-off:

- migration cost: 6 builtin × 各 seeds/primitives で 60〜100 行の JSON を書く + Rust seed test
  更新。 ただし 1 度きり。
- CSS `[data-theme='ID']` block を keep するか撤去するかは別判断 (撤去すれば SSOT が成立する一方、
  CSS で定義していた `body::before` 等の非 var rule が残るため一部 keep が必要)。

### B 案 — `cloneTheme` 内で「**現時点 computed style から JSON を構築**」 して保存 (frontend 完結)

[`SettingsAppearancePane.svelte:74-103`](../../../src/lib/components/settings/SettingsAppearancePane.svelte) で `cloneTheme` を:

```ts
async function cloneTheme(sourceId: string) {
  const source = themeStore.themes.find((t) => t.id === sourceId);
  // ...
  // 既存: source.css_vars をそのまま渡す
  // 新案: source の見た目を一度 active 化 → getComputedStyle で seeds + primitives を読出 →
  //         それを JSON 化して新 custom の css_vars に保存。
  const computedJson = await captureSourceStyleSnapshot(source.id);
  const created = await themeStore.createTheme(cloneName, source.base_theme, computedJson);
  // ...
}
```

利点:

- migration 不要。 frontend だけで完結。
- builtin の seed snapshot だけでなく、 **user が theme editor で seed を弄った直後の状態を
  source にしてもその時点が複製される** (= user 直感どおり)。

trade-off:

- `oklch(from var(--c-bg) ...)` 等 runtime 計算が **事前展開された静的値** になる (= 派生関係が
  失われ、 後で user が seed を変えても computed が更新されない)。 ただ「複製」 は snapshot の
  isolation を期待する操作なので、 これは ergonomic に近い (むしろ意図と整合)。
- 「source の見た目を一度 active 化」 は user の active state を一時的に書き換えるため UX
  flicker のリスク。 hidden iframe / shadow DOM で oklch(from ...) を解決する別経路が必要。

### C 案 — `data-theme` attribute を新 custom にも継承させる (schema 寄せ)

新 custom theme schema に `inherit_data_theme: string | null` を追加し、 `applyTheme()` で
`data-theme = inherit_data_theme ?? activeMode` を立てる。 「brutalist-dark の複製」 は
`inherit_data_theme = 'brutalist-dark'` を持つため CSS block にマッチして aesthetic が当たる。

利点: migration が `ALTER TABLE` 1 行で済む。

trade-off:

- user が theme editor で 1 seed でも変えると inherit を捨てる必要があるが、 「変えた瞬間」 を
  判定する logic が必要 (== "実値で書く" にフォールバックする経路)。 結果 A 案の経路をいずれ
  実装することになり、 二重実装の負債を生む。
- CSS と DB の SSOT 統合が起きないため、 future maintenance が CSS 側で続く。

### D 案 — e2e 改修 (どの修正方針を採っても **必須**、 ② LB-2 と同じ哲学)

[`ph-cf-800-theme-settings.spec.ts`](../../../tests/e2e/ph-cf-800-theme-settings.spec.ts) の TS-3
(と TS-4) を:

1. **UI の「コピー」 / 「現在のテーマを複製」 ボタンを実 click** する経路に書き換え (`page.getByTestId('settings-theme-clone-brutalist-dark').click()` 等)。
2. **builtin を source にする** scenario を含める (brutalist-dark / neumorph 等)。
3. **assertion は `cloned.css_vars` の string 比較ではなく、 `getComputedStyle` で計測した
   `--c-bg` / `--c-primary` / `--surface-blur` / `--ag-radius-card` 等を source baseline と
   全一致** するかを verify。

これは PR #576 LB-2 で確立した「test seam は自動化不能な leaf 1 点のみ、 上流 UI と下流 IPC は
production と同じ path を踏ませる」 哲学の theme 領域への横展開。

### 推奨優先順位

1. **A 案 + D 案** を 1 PR にまとめる (短期、 schema 寄り根治 + 実 UI e2e gate を同時投入)。
2. C 案は中期 schema 拡張要求 (theme inheritance / variant) が出たタイミングで検討。 単独投入は
   負債を生むため非推奨。
3. B 案は theme editor 側で user-edited snapshot 系の機能要求が出たら検討。 単独で複製問題を
   解こうとすると oklch runtime 計算の事前展開でユーザビリティ低下リスク。

---

## 5. 仕様 / 実装 / テストの乖離

| 文書                                                                                                         | 主張                                                                       | 実装                                                                                          |
| ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| [`features/screens/settings.md`](../../l2_foundation/features/screens/settings.md) §テーマ複製契約           | 「source の look を新 ID で持ち直す」 (推測、 spec を確認すること)         | source `'{}'` を copy するだけ                                                                |
| [`features/backend/theme-service.md`](../../l2_foundation/features/backend/theme-service.md) §テーマ複製契約 | 同上 (推測)                                                                | 同上                                                                                          |
| `migrations/041_theme_six_builtins.sql` (line 28-29)                                                         | 「look は CSS の `[data-theme]` block で定義、 css_vars は空 '{}' で良い」 | builtin 自身の表示は OK だが、 **複製** で空 cssVars がそのまま新 custom に伝播する盲点を放置 |
| `tests/e2e/ph-cf-800-theme-settings.spec.ts` TS-3 / TS-4                                                     | 「F3 / F4 + F5 を機械検証」                                                | UI ボタンを click せず IPC 直叩き + tautology assertion で **bug 検出能力ゼロ**               |

修正 PR では (1) spec の表現を「source の **見た目** を新 ID で持ち直す」 と明確化、 (2) builtin
schema convention の盲点 (空 cssVars 複製) を spec に明示、 (3) TS-3 / TS-4 の e2e を実 UI 経路 +
computed style 比較に書き換える、 を併せて行うべき。

---

## 6. 横展開 (lateral sweep)

CLAUDE.md `<critical-rule id="lateral-sweep">` に従い、 「**e2e が UI ボタンを click せず IPC を
直叩きしている test 群**」 を全 spec 横断で audit すべき (= PR #570 LB-2 / 本 TS-3 / TS-4 が同型)。

候補 audit script (実装は別 PR、 本 audit は方向性のみ):

```bash
# scripts/audit-e2e-ui-bypass.sh (案)
# 各 spec で「describe された UI feature 名」 と「実際に click している data-testid」 を対照し、
# 当該 feature の主要 button (`-button` / `-toggle` / `-submit` 等) が test 内で 1 度も click
# されていない場合に warning を出す。
```

これは別 audit doc で追跡可。

---

## まとめ

| 問い                               | 答え                                                                                                                                                        |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 真因                               | builtin theme の `css_vars='{}'` schema convention + CSS `[data-theme]` block で look を持つ設計が、 **複製** で空 cssVars が新 custom に伝播することを放置 |
| ② Library アイコン即時反映と同じか | 構造的に同型 — 「合成経路 e2e で green、 実機で壊れている」 (テスト空転)                                                                                    |
| PR #566 F3 fix で直したこと        | source 未解決時の silent fallback 撤去のみ — source 解決後の空 cssVars copy 問題は未対応                                                                    |
| user 困りごと                      | brutalist-dark / neumorph 等を source にしても新 custom が default Dark / Light に化ける                                                                    |
| e2e 修正                           | TS-3 / TS-4 を実 UI ボタン click + computed style 比較に書換 (PR #576 LB-2 の seam 哲学を theme 領域へ横展開)                                               |
| schema 修正                        | A 案 (builtin cssVars を実値 seed) が推奨。 C 案 (data-theme 継承) は二重実装負債、 B 案 (clone 時 computed snapshot) は oklch 派生関係喪失リスク           |

実装は別 PR で 「**A 案 + D 案 を 1 PR**」 として進めることを推奨。 本 audit は方向性提示までで、
コード変更は含まない。
