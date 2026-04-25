---
id: PH-20260425-294
status: todo
batch: 67
type: 整理
---

# PH-294: Library 系コンポーネント責務整理 + ux_standards 追記

## 参照した規約

- `docs/l1_requirements/ux_standards.md`
- `arcagate-engineering-principles.md` §7 リファクタ発動条件

## 背景・目的

batch-65/66/67 で Library 系のコンポーネント / 状態管理が肥大化:

- LibraryDetailPanel (~250 行)
- LibraryCard (~130 行)
- LibrarySidebar (?)
- LibraryMainArea (~280 行)
- LibraryCardSettings (~200 行)

ux_standards.md に「お気に入りボタン仕様」「左パネル 4 セクション仕様」など batch-67 で確立したルールが書かれていない → 後続バッチで再発する。

## 仕様

### A. ux_standards.md 追記

新規セクション「§N. Library 操作 UX 規約」:

- お気に入りボタン: アイコン + 「お気に入り」テキスト、塗り/枠で state
- タグ追加 UI: 「+ タグを追加」ボタン明示
- 可視/不可視: チェックボックス + 説明 hint
- 左パネル: 4 セクション + 罫線分離
- 背景なしモード時のアイコン: drop-shadow-md（決定値）

### A-2. ラベル原則の徹底（全画面 audit、batch-67 必須）

ユーザ指摘により以下を反映済（本 Plan で完了マークする）:

- **CLAUDE.md 哲学節**: 「ラベルはアイコン名ではなく機能 / 状態 / アクションを書く」
- **`docs/desktop_ui_ux_agent_rules.md` P4 補足**: 違反例・正例・書き分け方ルール表
- **`docs/lessons.md`**: 「アイコン + ラベルの整合性」失敗パターン記録

**全 button / chip audit**: Library / Workspace / Settings / Palette のすべての button と chip について、ラベルが「アイコン名そのまま」になっていないか手動確認 + 修正。範囲が広いので grep で `<Star\|<Settings\|<Trash\|<Plus\|<Search\|<Menu` 周辺の text を見て確認する。

具体的修正対象（既知）:

- LibraryDetailPanel お気に入りボタン: ⭐ + 「お気に入り」（PH-291 で定義）
- 他全 button の aria-label / 子テキストを audit、違反は本 Plan で同時修正

### B. LibraryDetailPanel の分割（必要なら）

250 行は engineering-principles.md §7 警告閾値（500 行 warning / 1000 行 refactor）から十分離れているため、本 Plan では分割せず、観察のみ記録。

### C. LibrarySidebar の責務確認

タグ表示ロジックが大きい場合、`LibrarySidebarSection.svelte` 等のサブコンポーネント抽出を検討。

### D. 規約違反スキャン

`pnpm verify` の lint で検知できないルール（お気に入りボタン仕様等）は機械化不可なので、**`/simplify` レビューチェック項目**としてリストに追記する。

## 受け入れ条件

- [ ] ux_standards.md に Library 操作 UX 規約セクション追加 [Structure]
- [ ] PH-291 / 292 の仕様がドキュメントで参照可能 [P consistency]
- [ ] LibrarySidebar の現状 LoC 計測（分割判断のためのベースライン）[Structure]
- [ ] `pnpm verify` 全通過

## 自己検証

- ux_standards.md の Library セクションに 5 ルール記載
- 次バッチ Plan で参照される
