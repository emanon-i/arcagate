---
id: PH-20260427-463
status: done
batch: 104
type: 防衛
era: Distribution Era Hardening
---

# PH-463: auto-kick 動作実証 (PH-453 deferred 解消)

## 問題

batch-100 で auto-kick prompt 「write action MANDATORY」修正後の動作実証が batch-101 で deferred。本 plan で transcript 確認 + 結果記録。

## 実証結果

### 走行確認

最新 auto-kick 走行 transcript: `C:/Users/gonda/.claude/projects/E--Cella-Projects-arcagate/b15aeca7-7619-4170-a9e6-ed1c26202aa3.jsonl` (Apr 27 15:13)

- ✅ scheduled-task 走行している (`enabled: true`、cron `*/20 * * * *`)
- ✅ session が起動して prompt を実行
- ✅ Bash / Edit 等の tool use が観察される

### **問題発見**

auto-kick session の動作内容:

- 期待: `list_sessions` → `read_transcript` → idle 検知 → **`send_message`** で kick prompt 投下
- 実際: open PR 確認 → **自分で RELEASE.md を編集し始める** (PH-455 関連の docs 改修を作業しようとした)

### 根本原因

prompt の「write action MANDATORY」を agent が拡大解釈し、send_message 以外の write tool (Edit / Bash で git commit) も MANDATORY と判定。
結果、auto-kick session が「自ら作業する」モードになり、本来の dispatch session への kick prompt 投下が起きない。

### 修正方針 (batch-105 候補 PH-464)

prompt をさらに refine:

- 「write action は send_message **のみ**、Edit / Bash の修正系コマンドは禁止」を明示
- 「open PR があっても、自分で commit / push しない、本タスクは監視 + send_message のみ」
- read-only mode での動作を強制

### lessons.md に追記

scheduled-task の prompt 設計で「MANDATORY」「ONLY」のスコープを厳密に書く必要。
agent は「write action」を広めに解釈する傾向。

## 受け入れ条件

- [x] 最新 auto-kick 走行 transcript 確認
- [x] 動作した (走行 + tool use observed)
- [x] 動作不一致発見 (send_message 不在、自作業に逸脱)
- [x] 修正方針確定 (PH-464 候補で prompt refine)
- [x] 本 plan 文書に結果記録
- [ ] lessons.md 追記 (本 PR 内で対応)

## 別 plan に切り出し

- **PH-464**: auto-kick prompt refine (write action = send_message ONLY、自作業禁止) → batch-105
