# Measurement Snapshot — Running Process (D5 idle memory baseline)

**Method**: 非破壊計測。user 環境で動作中の arcagate.exe を `Get-Process` で sampling、kill しない。

## 2026-05-04 17:54 (R4-D snapshot 1)

| 項目                            | 値                             |
| ------------------------------- | ------------------------------ |
| process                         | arcagate.exe PID 32324         |
| StartTime                       | 2026-05-05T11:23:05.978 +09:00 |
| Uptime                          | 6 h 41 min                     |
| RSS (PrivateMemorySize64 / 1MB) | **23 MB**                      |

### 判定 (audit D5)

- **Pass criteria**: idle 5 min 後の RSS ≤ 120 MB (ux_standards.md §1)
- **観測**: 6.7 h 連続稼働後の RSS = 23 MB (threshold の 19%)
- **判定**: ✅ **PASS** (実機で大幅に余裕あり、6.7 h 経過でも 120 MB の遥か下)

### 副次観測 (audit C2 / C3 部分的根拠)

idle 30 min での増加 ≤ 10 MB の **直接計測ではない** が、6.7 h 稼働で RSS が 23 MB に
収まっていることから、メモリリークが accumulating していれば数百 MB 級になっていたはず。
本観測は C2 / C3 の **部分的 PASS の弱根拠** として採用。正式な soak は次回 user
session で `measure-memory-soak.ps1 -Minutes 30` で取得する (R4-D 継続)。

## 補記: 計測 reproducibility

- script: 直接 PowerShell で `Get-Process arcagate | Select PrivateMemorySize64`
- snapshot は 1 サンプリング (起動間 RSS 変動を無視)
- 厳密な P95 / 25 サンプル は user の dev session 終了後に `measure-memory-soak.ps1` で取得 (deferred、blocker でない)
