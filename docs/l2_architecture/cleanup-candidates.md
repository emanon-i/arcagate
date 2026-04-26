# Cleanup Candidates — batch-90 PH-409

walkthrough 結果から「使われていない / 重複 / 削除可」と判断された機能の削除候補リスト。
batch-90 では **削除しない**（リスト作成のみ）、次バッチ以降で消化。

## 集計

walkthrough（PH-406）の結果、削除候補 **0 件**:

- Refactor Era（batch-82〜85）で大規模整理済
- batch-87 PH-392 で `watched_folders` deprecated 完全削除
- batch-88 PH-396 で音声機能完全削除
- 残存機能は全て use-cases.md 10 ケースのいずれかに紐づき、削除候補なし

## 監視継続項目

将来削除候補化の可能性があるが、現時点で active:

- `arcagate/common/Tip.svelte` / `WidgetShell.svelte` 配置（PH-376/391/395/400 deferred chain で配置整理予定、削除ではなく移動）
- `LibraryCardSettings.svelte` 配置（同上、library/ 配下に移動候補）

これらは **配置整理であって削除ではない**ため、cleanup-candidates ではなく PH-400 deferred chain の領域。

## 結論

batch-90 audit で削除すべき機能は発見されず。Refactor Era + Polish Era で十分整理済と判断。

batch-91 以降は機能追加 / 改修フォーカスで進める。
