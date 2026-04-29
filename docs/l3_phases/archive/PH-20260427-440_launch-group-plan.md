---
id: PH-20260427-440
status: pending-approval
batch: 96
type: 改善
era: Polish Era 完走判定 + 機能拡張
---

# PH-440: launch group 機能起票 (Rule A、ユーザ承認待ち)

## 問題

use-case-friction-v2 case 3 H7 severity 3 + Codex Q4 macro 候補:
「プロジェクト関連を一気に起動」が UI 上に存在しない。1 操作で複数起動 = Raycast Quicklinks bundle / Alfred Workflow / Stream Deck 1 ボタン複数起動 と同等の業界標準パターン。

## Rule A 該当

- 構造拡張 (新テーブル + 新 widget + 新 UI)
- 5 ファイル以上影響
- ユーザ承認必須

## 改修案 (実装は別 batch、ユーザ承認後)

### Rust 側

- `launch_groups` テーブル新設
- マイグレーション 018 追加: id (UUIDv7) / label / item_ids (JSON array) / sort_order / created_at / updated_at
- `launch_group_repository.rs` + `launch_group_service.rs`
- `cmd_create_launch_group / cmd_update_launch_group / cmd_delete_launch_group / cmd_list_launch_groups / cmd_launch_group` IPC

### フロント側

- `src/lib/widgets/launch-group/` 新設 (LaunchGroupWidget.svelte + index.ts + Settings)
- WIDGET_LABELS に `launch_group: 'ランチグループ'` 追加
- ts-rs で WidgetType enum 拡張

### UX

- Workspace に LaunchGroup widget 追加可能
- Settings > Workspace に「グループ管理」section
- グループクリック → 順次 launchItem (失敗時の集約 toast)
- Palette からも `g:<group-name>` で起動可能

## 受け入れ条件 (ユーザ承認後)

- [ ] ユーザ承認 (Rule A)
- [ ] 実装は別 batch (batch-97 or batch-98) で着手
- [ ] 本 plan は **承認待ち** として待機
- [ ] 承認後、本 plan の status: pending-approval → todo → wip → done

## ユーザへの提示内容

batch-96 完走時に dispatch-log で:

> 機能拡張 launch group の Plan 起票済 (PH-440)。Rule A 該当でユーザ承認待ち。
> 実装規模: Rust マイグレーション 018 + 新 widget + Settings 管理 UI で 5+ ファイル。
> 業界標準 (Raycast / Alfred / Stream Deck) 同等の macro 起動機能。
> 承認いただければ batch-97 or batch-98 で実装着手。
