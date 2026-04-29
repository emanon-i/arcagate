# Lessons

過去の失敗から抽出した「**再発したら大事故**」のメタ教訓のみ残す。
個別 bug の workaround は audit script / コード内コメント / git blame で辿れるので除去。
詳細な歴史は `docs/archive/lessons-historical.md`。

---

## <severity>critical</severity> 「verify pass = 治った」 と書くな (2026-04-29 user 激怒で確定)

### 観測

- agent が「pnpm verify 全段 pass」「CDP DOM 存在確認 31/31」を以て **完成宣言**
- user dev 目視で「全然治ってない」と再指摘 → 信頼を 1 度失う
- root cause: 機械検証 = コードが動く保証、**規格通り / 体感品質の保証ではない**

### 再発防止

<critical-rule id="dom-not-fixed">
- 完了報告から「✅」「治った」「完成」を screenshot + 動作確認 + Codex OK の三点セットなしで書かない
- DOM の存在確認だけで pass とせず、自分で screenshot を Read して「規格通りか」を目視評価する
- agent 検証範囲は「**機械的に確認できた範囲**」と明示、最終 OK は user dev 検収
- 不確かなら不確かと書く。「動くはず」「たぶん」の表現は禁止
</critical-rule>

参照: `docs/archive/lessons-historical.md` の「2026-04-28 / 2026-04-29 retrospective」

---

## <severity>critical</severity> Guideline doc を読まないと UI 品質が落ちる

### 観測

- `ux_standards.md` / `desktop_ui_ux_agent_rules.md` / `arcagate-visual-language.md` 等 5 本以上の指針 doc が存在
- batch-107〜109 で **plan に doc citation がない** 状態で実装 → 派手 destructive button / 段階実装無視 / 一貫性違反が累積し、29 commits を hard rollback
- root cause: 「自分で考えるだけで判断していた」

### 再発防止

<critical-rule id="cite-guideline">
- Plan / 設計時に **必ず** `memory/design_guidelines_index.md` から該当 doc を引いて該当 section を Read してから書く
- Plan 文書 / PR description に「引用元 doc + section」を明示するテーブル必須
- guideline 不整合は plan の前に doc を update（または同一 commit に embed）
- 横展開 audit は doc 規定の構造で行う（1 ファイル fix で済ませない）
</critical-rule>

---

## <severity>high</severity> CSS トークン未定義は静かに失敗する

### 観測

`var(--ag-foo)` 未定義でも Tailwind / svelte-check / clippy のいずれもエラー出さない。色が出ない見た目だけで気付く。

### 再発防止

- 新しい `var(--ag-*)` を使う箇所は同コミットで `arcagate-theme.css` への追加を必ずする
- `audit-design-tokens.sh` でハードコード色を機械検出（既存）

---

## <severity>high</severity> 並行 PR は破綻する（user-redo モードでは禁止）

### 観測

- 1 batch = 5 plan の並行 push 運用 + auto-merge で「検収経路がない」まま speed に振った結果、user 体感品質が後退
- 複数 session が同 plan ID を取り合い duplicate PR 量産（resume 8 で 3 PR close）
- merge conflict 多発 → rebase で時間消耗

### 再発防止

`docs/dispatch-operation.md §11 user-redo depth-first` 必読。
1 issue 完了 → user 検収 → 次 issue。speed より確実性。

---

## <severity>high</severity> Native `<select>` の dropdown popup は OS 依存で読めなくなる

### 観測

dark theme で native `<select>` の trigger は themeable でも、**popup options は OS 既定 light scheme** で描画されてしまう。`color-scheme` が cascade しないケースあり。3 回連続で user 指摘されて確定（最重大級）。

### 再発防止

`src/app.css` で:

```css
.dark select { color-scheme: dark; }
.dark select option { background-color: var(--ag-surface-1); color: var(--ag-text-primary); }
```

を全ての `<select>` に強制適用。bits-ui / 自作 dropdown へ置換も検討。

---

## <severity>high</severity> pointerdown + onclick の二重発火が起きる（pointer capture）

### 観測

`setPointerCapture` した button で pointerdown / pointerup / click が**全て同じ要素に向かう**ため、ドラッグ前提コードで onclick も併設すると **二重発火** し widget が 2 個追加される等のバグ発生（user 検収項目 #6）。

### 再発防止

- pointerdown でドラッグを起動するコンポーネントには **onclick を併設しない**
- `pointerup` ハンドラ側で「ドロップ位置あり = drag、なし = click」と分岐させて 1 経路に統一
- WorkspaceWidgetGrid のように conditional mount される component が listener を持つと、空状態で listener 無し → 動作不能になる。常時 mount する

---

## <severity>medium</severity> Playwright × Tauri WebView2 の落とし穴

CDP 接続 / 入力キャプチャ / D&D の罠は多数。詳細は `docs/archive/lessons-historical.md`。
特に `page.mouse.up()` を `afterEach` で必ず呼ぶ（テスト失敗時にマウスボタンが OS レベルで押下状態のまま残る事故あり）。

---

## <severity>medium</severity> アーカイブ時の git add -u 漏れ

`mv` でアーカイブ後、`git add archive/` だけでは元の場所の delete が staging されない。
正しくは `git add -A` または `git add -u src/` も実行。

---

## <severity>reference</severity> よく踏む細かい罠（archive 参照）

具体パターンは `docs/archive/lessons-historical.md` を on-demand で grep:

- shadcn-svelte CLI の `import type` バグ（テンプレ側でランタイム値として使う）
- biome 2.x の override で linter.enabled: false が効かない
- Svelte 5 `$effect` の配列依存追跡（`.length` だけ追跡される）
- E2E `webServer.timeout` / `globalTimeout` / `expect.timeout` の CI/local 分岐
- AppError serialize を `{ code, message }` 構造体に
- shell-words による Windows 引数安全化
- `RecursiveMode::Recursive` で watcher サブフォルダ監視
- ts-rs で Rust enum → TS bindings 自動生成
- DEFAULT 列リスト記載でエポック挿入される SQLite バグ
