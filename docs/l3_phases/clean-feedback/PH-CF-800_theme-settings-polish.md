---
id: PH-CF-800
status: planning
batch: clean-feedback
type: 改善
era: Distribution Hardening
parent: README.md
---

# PH-CF-800: テーマ / 設定 polish

## 元 user fb (検収項目)

- **F1**: テーマ並び順を「ダーク / ライト → ブルータリスト ダーク / ライト → ニューモーフ ダーク / ライト」 に
- **F2**: ダークのプライマリカラーが明るすぎ白文字がつぶれる → コントラスト改善
- **F3**: 「現在のテーマを複製」 が選択中テーマを複製しない
- **F4**: 各テーマ下の「コピーして編集 / コピー / ダウンロード」 が改行で表示崩れ → アイコンのみ + ツールチップ
- **F5**: 「コピーして編集」 と「コピー」 の二重は不要 → 「コピー」 押下で複製動作に統一
- **F6**: カスタムテーマに上限がある場合は上限を表示

## 引用元 guideline doc

| Doc                                                          | Section                              | 採用判断への寄与             |
| ------------------------------------------------------------ | ------------------------------------ | ---------------------------- |
| `docs/l2_foundation/features/screens/settings.md`            | テーマ UI                            | テーマカード・ボタン群の契約 |
| `docs/l2_foundation/features/backend/theme-service.md`       | theme CRUD                           | 複製 / 上限の契約            |
| `docs/l2_foundation/design-tokens.md`                        | カラートークン                       | F2 コントラスト基準          |
| `docs/l2_foundation/features/cross-cutting/design-tokens.md` | a11y                                 | WCAG 4.5:1                   |
| `CLAUDE.md`                                                  | `<critical-rule id="label-content">` | F4 アイコンボタンに tooltip  |

## Fact 確認 (root cause / 現状)

### F1: テーマ並び順

`theme_repository.rs:32` `find_all` の `ORDER BY is_builtin DESC, name` で builtin が先・英名アルファベット順。 builtin 英名は `Brutalist / Dark / HUD / Light / Neumorph` → 現状の並び = **Brutalist → Dark → HUD → Light → Neumorph**。 フロント (`theme.svelte.ts:114-116`、 `SettingsAppearancePane.svelte:163`) は並べ替えしない。

**未解決の確認事項**: user 希望順は 6 項目 (dark/light × 3 系統) だが、 現状 builtin は **5 本 (Dark / Light / Neumorph / Brutalist / HUD)** で dark/light の 2 バリアント構成ではなく HUD が希望リストに無い。 「テーマ体系を 6 本へ拡張するか / 既存 5 本を希望順に近づけて並べるだけか」 を実装着手前に user 確認する (README §未解決の確認事項)。 並び替え機構の導入自体は確定。

### F2: ダーク primary が明るすぎ

`arcagate-theme.css:218` の `.dark`: `--c-primary: oklch(0.78 0.13 200)` — lightness 0.78 は非常に明るい。 `--ag-accent-text` (`:120`) は `color-mix(in oklab, var(--c-primary), var(--c-fg) 52%)` で dark の `--c-fg` ≈ 白 (`oklch(0.96 …)`) → accent-text ≈ L0.87。 primary ベタ塗りに白文字が乗る箇所 (widget badge / primary button 等) でコントラスト比 ≈ 1.3:1、 WCAG 4.5:1 を大きく下回る。

**他テーマも同種問題**: `hud` (`:515` `--c-primary: oklch(0.82 0.17 85)`) が最も明るく dark と同じく深刻 (≈1.2:1)。 `neumorph` (`:417` L0.66) / `brutalist` (`:457` L0.58) / `light` (`:32` L0.62) も white-on-primary は 4.5:1 にやや届かない。 全テーマで「primary ベタ + 白文字」 が危うい。

### F3: 「現在のテーマを複製」 が選択中を複製しない

`SettingsAppearancePane.svelte:70-72` `cloneCurrentTheme` は `cloneTheme(themeStore.activeMode)` を呼ぶ。 `cloneTheme` (`:53-68`) は `themeStore.themes.find(t => t.id === sourceId)` でソースを引く。 `activeMode` は `theme.svelte.ts:53` で localStorage 初期化 → `loadTheme()` (`:109`) で IPC 更新。 **`themes` 配列が未ロードのうちに押す / localStorage cached mode が実 DB と乖離** していると `find` が `undefined` → `:54-57` のフォールバックで `cssVars='{}'` のデフォルト複製になる。 builtin カードの「コピーして編集」 (`:199` `cloneTheme(theme.id)`) は `{#each}` の実 id を渡すので `find` が必ずヒットし問題なし。 不具合は `cloneCurrentTheme` 経路のみ。

### F4: テーマカード下ボタンの改行崩れ

`SettingsAppearancePane.svelte:179-219` の `<div class="flex gap-1 px-1">` 内に最大 3 ボタン (「コピーして編集」 `:196-202` / 「コピー」 `:204-211` / 「ダウンロード」 `:212-218`)。 各ボタンが `px-2 py-0.5 text-xs` のテキストラベル。 グリッドが `grid-cols-2` (`:161`) でカード幅が狭く、 日本語ラベルが flex 内で折り返してボタン高さが不揃いになり崩れる。

### F5: 「コピーして編集」 と「コピー」 の二重

- 「コピーして編集」 (`:196-202`) → `cloneTheme(theme.id)` → backend `create_theme` (`theme_service.rs:42`) で DB に複製 + エディタを開く = **テーマの複製**
- 「コピー」 (`:204-211`) → `handleExport` (`:74-80`) → `export_theme_json` (`theme_service.rs:107`) でテーマ JSON 文字列を取得し `navigator.clipboard.writeText(json)` = **クリップボードへ JSON を書く**。 一般 user には意図不明

### F6: カスタムテーマ上限

`theme_service.rs:42-62` `create_theme` / `theme_repository.rs:6-18` `insert` のいずれにも **件数上限・MAX 定数・件数チェックは存在しない**。 `themes` テーブルにも件数制約なし。 唯一の制約は name の UNIQUE。 → **「無言で作れなくなる」 事象は現状発生しない** (上限が無いため)。

## スコープ

テーマ / 設定画面の polish 6 件。 F6 は「上限が無い」 ことの確認結果を踏まえ、 上限を新設するか否かを含む。

## やらないこと

- テーマエディタ本体の機能変更
- design-tokens.md のトークン体系全面見直し — F2 で必要な dark / hud の primary 明度調整に限定

## 具体タスク

1. **F1**: 明示的な並び順を導入。 `themes` テーブルに `sort_order` 列を追加 (migration) し `find_all` の `ORDER BY` を `sort_order` に変更。 builtin の `sort_order` を希望順に設定。 **着手前に README §未解決の確認事項 (テーマ体系 5 本 vs 6 本) を user 確認**
2. **F2**: `arcagate-theme.css:218` の dark `--c-primary` の lightness を下げる (例 0.78 → 0.58-0.62) で white-on-primary が 4.5:1 を満たすように。 `hud` (`:515`) も同様に調整。 `--ag-accent-text` 派生式 (`:120`) が「明背景には暗文字 / 暗背景には明文字」 を保証するか見直し。 design-tokens.md と突き合わせ
3. **F3**: `cloneTheme` の `find` 失敗時にデフォルトへ黙ってフォールバックせず、 `themes` 未ロード時はボタン disabled / `cloneCurrentTheme` 前に `activeMode ∈ themes` を保証 / フォールバック時はエラー表示
4. **F4**: `SettingsAppearancePane.svelte:179-219` の 3 ボタンをアイコンのみ + `title` / `aria-label` ツールチップへ。 `Copy` は import 済、 `Pencil` / `Download` 等を追加 import
5. **F5**: 「コピー」 押下を複製動作 (`cloneTheme`) へ統一。 `handleExport` / clipboard 書き込み / `copy_done` 表示を廃止。 JSON のエクスポートは「ダウンロード」 (`handleExportDownload`) に集約 (`exportTheme` store API は残す)
6. **F6**: 上限は現状なし。 上限を設けるか否かを判断 — 設けるなら `theme_service.rs:create_theme` でカスタム件数 (`is_builtin == false`) を数え `MAX_CUSTOM_THEMES` 超過で `AppError::InvalidInput`、 `import_theme_json` (`theme_service.rs:114`) にも同チェック、 UI に「N / MAX」 表示と上限到達時 disabled。 設けないなら「上限なし」 を doc 化して指摘をクローズ

## 受け入れ条件 (機械検出)

- [ ] F1: テーマ一覧の表示順が定義した `sort_order` 通り (snapshot)
- [ ] F2: dark / hud の white-on-primary コントラスト比が WCAG 4.5:1 以上 (コントラスト計算の unit test か axe チェック)
- [ ] F3: unit / e2e — テーマ B を選択中に「現在のテーマを複製」 → 複製されたテーマの `css_vars` が B と一致 (デフォルトでない)
- [ ] F4: テーマカード下ボタンがアイコンのみ + `aria-label`、 改行が発生しない (snapshot)
- [ ] F5: 「コピー」 ボタンが複製を行う / clipboard 書き込みが起きない (e2e)
- [ ] F6: 上限を設けた場合 — 上限到達でボタン disabled + 件数表示。 設けない場合 — doc に「上限なし」 明記

## 機能契約の追記

`features/backend/theme-service.md`:

> **テーマ複製契約**: 「現在のテーマを複製」 は選択中テーマ (`activeMode`) を厳密に複製する。 ソースが見つからない場合はデフォルトへフォールバックせず、 操作を無効化するかエラーを返す。
>
> **カスタムテーマ上限契約**: (上限を設ける場合) `create_theme` と `import_theme_json` の双方で同一の `MAX_CUSTOM_THEMES` を検査する。 上限は UI に常時表示する。

`features/screens/settings.md`:

> **テーマ並び順契約**: テーマ一覧の順序は `sort_order` で明示する。 英名アルファベット順に依存しない。
>
> **テーマカードのアクション契約**: テーマカードのアクションはアイコンボタン + tooltip。 「複製」 系のアクションは 1 つに統一し、 クリップボードへの JSON コピーを「複製」 と混在させない。

`features/cross-cutting/design-tokens.md`:

> **accent コントラスト契約**: 全テーマで primary ベタ塗りの上に乗るテキストは WCAG 4.5:1 以上。 accent 面のテキストは `--ag-accent-text` トークン経由 (自動コントラスト) を徹底する。

機械検出: F2 のコントラスト計算 unit test (全 builtin テーマ × white-on-primary)、 F3 の複製 unit test を常設。

## 横展開

- **F2**: white-on-primary は全 5 テーマで危ういため、 dark / hud だけでなく neumorph / brutalist / light も同 unit test の対象にして、 違反テーマを洗い出す
- **F5**: クリップボードへ「謎情報」 を書く UI が他にないか grep (`navigator.clipboard.writeText`)
- **F1**: テーマ選択 UI が `SettingsAppearancePane` 以外 (onboarding 等) に別実装で存在しないか確認

## 工数感

| Task                                    | 工数     |
| --------------------------------------- | -------- |
| F1 sort_order migration + 反映          | 1 日     |
| F2 primary 明度調整 + コントラスト test | 1-1.5 日 |
| F3 複製ソース修正                       | 0.5 日   |
| F4 アイコンボタン化                     | 0.5 日   |
| F5 ボタン統合                           | 0.5 日   |
| F6 上限判断 + (設ける場合) 実装         | 0.5-1 日 |

合計: 約 4-5 日。

## 依存・着手順

- **先行**: なし。 ただし F1 は実装前に user 確認 (テーマ体系) が要る
- **後続**: なし

## 参照

- `src-tauri/src/repositories/theme_repository.rs:6-18, 32`
- `src-tauri/src/services/theme_service.rs:42-62, 107, 114`
- `src/lib/state/theme.svelte.ts:53, 109, 114-116`
- `src/lib/components/settings/SettingsAppearancePane.svelte:53-80, 161-219`
- `src/lib/styles/arcagate-theme.css:32, 107, 119-120, 218, 417, 457, 515`
