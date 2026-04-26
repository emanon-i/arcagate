---
id: PH-20260427-416
status: todo
batch: 92
type: 改善
era: UX Audit Re-Validation
---

# PH-416: 一貫性バグ一括修正（design token / 表記揺れ / Nielsen H4）

## 問題

batch-91 PH-413 Codex review が指摘した「一貫性バグ」の具体例:

- ホットキー表記揺れ（`Ctrl+Space` vs `Alt+Space` vs `Ctrl+Shift+Space`）→ batch-91 で 1 箇所修正済、grep で全件 audit 必要
- design token 逸脱（`bg-[#ffffff]` 等のハードコード色 vs `var(--ag-*)` トークン）
- アイコン + ラベル不整合（`<Star /> + "星"` 系、CLAUDE.md / lessons.md 既出）
- 同機能の異名表記（「お気に入り」「Favorites」「スター」）

これらは Nielsen H4（Consistency and standards）違反、severity 2-3 が多発予想。

## 改修

### 1. ホットキー表記の grep audit

- 検索対象: `Ctrl[+_]?Space` / `Alt[+_]?Space` / `Ctrl[+_]?Shift[+_]?Space` 等
- 検索ファイル: `src/`, `docs/`, `README.md`
- 真の値（`src-tauri/src/services/hotkey_service.rs` の登録値）を source of truth に統一

### 2. design token 違反 grep audit

- 検索対象: `bg-\[#`, `text-\[#`, `border-\[#`, `text-\[rgb`, `bg-\[rgba` 等
- 検索ファイル: `src/lib/components/**/*.svelte`, `src/routes/**/*.svelte`
- shadcn-svelte 生成ファイル（`src/lib/components/ui/`）は除外（手動編集禁止）
- 1 箇所ずつ `var(--ag-*)` トークンに置換、未定義のトークンは `arcagate-theme.css` に追加

### 3. アイコン + ラベル不整合

- 検索対象: `<Star.*/>.*"星"` / `<Plus.*/>.*"プラス"` / `<Settings.*/>.*"歯車"` 等
- 機能名 / 状態名 / アクション名に置換
- `aria-label` も同時修正

### 4. 同機能の異名表記

- 検索: 「お気に入り」「Favorites」「スター」「favorite」（i18n キー / UI ラベル / コメント）
- `src/lib/nav-items.ts` を source of truth に統一

### 5. 機械化（横展開）

- `scripts/audit/check-hotkey-consistency.sh` 新設: hotkey 表記の自動 audit
- `scripts/audit/check-design-tokens.sh` 新設: ハードコード色の自動 audit
- lefthook + CI step に統合

## 解決理屈

- Nielsen H4 違反を **機械化で再発防止** → 規約ドキュメントの形骸化を防ぐ（lessons.md 既出反省）
- 1 ファイル修正で終わらず、**横展開で全画面 audit**（CLAUDE.md 哲学節）
- batch-91 PR #148 の hotkey micro fix を「単発」から「一括」へ昇格

## メリット

- 一貫性違反が CI で止まる仕組みになる
- 配布水準の客観評価項目が増える（engineering-principles §9）
- 次回 audit でこの観点を skip 可能（機械が常時 watch）

## デメリット

- 全 audit 結果を確認する手間
- 既存 design token 体系の見直しが伴う可能性
- shadcn ↔ AG ブリッジの再確認（`app.css` の `--background` → `var(--ag-*)` 等、batch-43 既往）

## 受け入れ条件

- [ ] hotkey 表記不整合 0 件（grep + 自動 audit script）
- [ ] design token ハードコード色 0 件（除外リスト除く）
- [ ] アイコン + ラベル不整合 0 件
- [ ] 「お気に入り」異名表記統一
- [ ] `scripts/audit/check-hotkey-consistency.sh` + `check-design-tokens.sh` 新設、lefthook + CI 統合
- [ ] 修正前後の件数を PR 本文に記載
- [ ] `pnpm verify` 全通過

## SFDIPOT 観点

- **S**tructure（構造）: トークン体系の一貫性
- **I**nterface（界面）: UI 表記の一貫性
- **P**roduct internal consistency（HICCUPPS）: 製品内の他機能との一貫性

参照: lessons.md「規約ドキュメントの形骸化」/ CLAUDE.md「同じ機能には同じアイコン + 同じラベル」
