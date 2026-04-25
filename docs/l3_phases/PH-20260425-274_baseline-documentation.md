---
id: PH-20260425-274
status: done
batch: 63
type: 整理
---

# PH-274: ベースライン統合文書 + §7 閾値確定

## 背景・目的

PH-270〜273 の計測結果を統合し、engineering-principles.md §7 の LCOM/CBO 閾値を実数で確定する。
以降の PR 受け入れ条件として機能する数値ベースラインを確立する。

## 作業内容

### refactoring-opportunities.md 更新

`docs/l2_architecture/refactoring-opportunities.md` の「次バッチへの入力」セクションを
PH-270〜273 の計測結果で更新。

追加内容:

- バンドルサイズ現状値（§5 制約との比較）
- LoC / fan-out 閾値超過ホットスポット（§7 更新）
- 依存品質チェック結果から来る要対応事項

### engineering-principles.md §2「実績ベース検証」埋め込み

§2 末尾の「実績ベース検証（棚卸しフェーズ後に埋める）」セクションに：

- 現状の `cmd_*` コマンド一覧（batch-59 frontend-backend-split.md から転記）
- フロント側の重い処理（計測結果から）
- 移譲候補リスト（現時点では少ない見込み）

### §9 運用定義のベースライン確定

engineering-principles.md §9 の未計測指標に計測値を記入：

- エラートースト発生率: 計測開始前のため「未計測（初回ベースライン確立待ち）」と記録
- 起動 P95: CI 計測環境なし → `pnpm tauri build` 後の実機計測値を記録

### dispatch-log 更新

batch-63 完了エントリを dispatch-log.md に追記。

## 成果物

- `docs/l2_architecture/refactoring-opportunities.md` 更新
- `docs/l0_ideas/arcagate-engineering-principles.md` §2 + §9 更新
- `docs/dispatch-log.md` batch-63 完了記録

## 受け入れ条件

- [ ] refactoring-opportunities.md が PH-270〜273 結果で更新される
- [ ] engineering-principles.md §2「実績ベース検証」が埋まる
- [ ] §9 の未計測指標に現状値または「未計測（理由）」が記録される
- [ ] 次バッチ（batch-64）の整理系候補が明確になる
- [ ] `pnpm verify` 全通過（docs のみ変更）
