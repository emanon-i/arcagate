---
id: PH-20260427-435
status: done
batch: 95
type: 整理
era: Dispatch Infra Overhaul
---

# PH-435: dispatch infra overhaul (auto-merge / auto-kick / queue / spawn-on-pressure)

## 問題

batch-91〜94 で連続 5 plan を回したが、idle 兆候 (CI 待ちで止まる / memory 保存で「次セッション復帰」発言 / scheduled wakeup 多用) が複数回検出された。
最終ライン: 「CI 走行中も常時 active poll、context 落ちるまで commit 出せ」を遵守する infra が必要。

## 改修

### 1. PR auto-merge 有効化 + branch protection (済)

- `gh repo edit --enable-auto-merge` で repo 設定 ON
- main の branch protection: required_status_checks (check / build / e2e / changes)、strict mode
- 以降 push 後は `gh pr merge <#> --auto --squash` で予約 → 緑で自動 merge

### 2. dispatch-queue.md 作成

- `docs/dispatch-queue.md` で Active Batch / Next Up / Completed のフォーマット
- 各 batch 着手 / 完了時に必ず更新するルールを dispatch-operation.md に明記

### 3. dispatch-operation.md 追記

- §X: PR auto-merge 必須運用
- §Y: dispatch-queue.md 更新ルール
- §Z: spawn-on-context-pressure 手順

### 4. auto-kick scheduled task

- `mcp__scheduled-tasks__create_scheduled_task` で 20 分おき監視 agent
- 判定ロジック (idle / failed CI / open PR / checkpoint 発言) で kick
- taskId: `arcagate-auto-kick`

### 5. spawn-on-context-pressure

- assistant turn 数 ≥ 1800 で snapshot → mcp__dispatch__start_task で次世代起動
- 自セッションは「次世代起動済み、退場」で終了
- handoff format `memory/spawn_handoff.md` 雛形

### 6. 既存 scheduled task 整理

- list で確認 → 既存 Arcagate hourly check 系があれば削除
- 確認結果: 既存タスクなし、本項目は no-op

### 7. lessons.md 追記

- 「auto-kick とは何か / spawn-on-pressure 発動条件」追記

## 解決理屈

- 「ScheduleWakeup 禁止 / CI 待ち idle 禁止 / memory 保存禁止」を機械的に防げる infra
- 人間に kick されないと idle 化する agent の癖を、外部 scheduled task と auto-merge で補完
- context 限界 (1800 turn) を客観閾値に設定、自動 hand-off で連続性確保

## 受け入れ条件

- [x] repo auto-merge 設定 ON 確認
- [x] main branch protection 設定 (strict + 4 contexts: check/build/e2e/changes)
- [x] `docs/dispatch-queue.md` 作成 (Active / Next Up / Completed)
- [x] `docs/dispatch-operation.md` §8-10 追記 (auto-merge / queue / spawn-on-pressure)
- [x] `arcagate-auto-kick` scheduled task 作成 (20 分間隔、cron `*/20 * * * *`)
- [x] `memory/auto_kick_config.md` に taskId + 判定ロジック記録
- [x] `memory/spawn_handoff.md` 雛形作成
- [x] `docs/lessons.md` に auto-kick / spawn-on-pressure / auto-merge 必須運用 追記
- [x] 既存 scheduled task 整理 (list で確認、Arcagate 系は本 task 1 件のみ)
- [x] `pnpm verify` 全通過

## SFDIPOT 観点

- **O**perations (運用): agent 運用の信頼性
- **S**tructure (構造): dispatch infra の永続化
- **T**ime (時間): auto-merge で merge waiting 時間ゼロ
