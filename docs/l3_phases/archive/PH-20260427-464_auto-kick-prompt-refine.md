---
id: PH-20260427-464
status: done
batch: 105
type: 整理
era: Distribution Era Hardening
---

# PH-464: auto-kick prompt refine (Allowed/Prohibited tool 厳密化)

## 問題

PH-463 で auto-kick 動作実証時、scheduled-task が send_message ではなく Edit / Bash で自作業を始めるケースを観測 (RELEASE.md 編集等)。prompt の "write action MANDATORY" を agent が拡大解釈していた。

## 改修

`mcp__scheduled-tasks__update_scheduled_task` で `arcagate-auto-kick` の SKILL.md を refine:

### Allowed (read + send_message ONLY)

- list_sessions, read_transcript
- Bash で `gh pr list/checks` (read-only)
- send_message

### PROHIBITED (絶対実行禁止)

- Edit / Write / NotebookEdit
- Bash で git commit/push/gh pr create/merge
- pnpm/npm/cargo の修正系

## 受け入れ条件

- [x] auto-kick task の SKILL.md 更新済み
- [x] Allowed/Prohibited list 厳密化
- [x] 送信先 send_message ONLY が write action として認知される

## 横展開チェック

- 他に scheduled-task で write action MANDATORY を含む prompt がないか確認 → なし
- dispatch-operation.md / SKILL 系に auto-kick の禁止事項を踏襲する prompt パターンを記録 → 不要 (auto-kick 固有)
