---
id: PH-20260427-400
status: deferred
batch: 89
type: 改善
era: Polish Era
---

## deferred 判断（batch-89 → batch-91+）

ユーザ新ルール（2026-04-27、`feedback_no_speculation_planning.md`）:

> Rule A: 5 ファイル超の大幅変更は **Dispatch に提案 → ユーザ承認待ち**

PH-400 は 30 ファイル変更見込みで Rule A 該当のため、Dispatch 経由でユーザ承認後に着手。
batch-90 Use Case Audit 完了後、Audit 結果と合わせて再評価する（配置整理が User Case とどう関わるかを見てから判断）。

---

# PH-400: Settings/utils 配置整理 専用バッチ（PH-376/391/395 deferred chain 消化）

## 参照した規約

- batch-83 PH-372 → batch-84 PH-376 → batch-87 PH-391 → batch-88 PH-395 → 本バッチで消化
- 1 PR = 1 構造的テーマ原則のため専用バッチに切り出し

## 仕様

batch-88 PH-395 の仕様をそのまま継承（30 ファイル変更見込み）:

- LibraryCardSettings → arcagate/library/LibrarySettings.svelte
- Tip → components/common/, WidgetShell → widgets/_shared/
- utils domain 整理（format-meta / clipboard-history / history-buffer）
- SettingsPanel カテゴリ別 component 分割（GeneralSection / WorkspaceSection / LibrarySection / AppearanceSection / DataSection、AboutSection は既存）

## 受け入れ条件

- [ ] LibraryCardSettings 移動 + 参照更新
- [ ] format-meta / clipboard-history / history-buffer の domain 配置
- [ ] SettingsPanel が 200 行以下
- [ ] 既存 e2e 全 pass
- [ ] `pnpm verify` 全通過
