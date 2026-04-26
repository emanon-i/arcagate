---
id: PH-20260427-383
status: todo
batch: 85
type: 防衛
era: Refactor Era / 性能フェーズ
---

# PH-383: idle memory 計測 + sysinfo Mutex 戦略 review

## 参照した規約

- `docs/l1_requirements/vision.md` idle memory ≤ 100 MB（非機能要求）
- `docs/l0_ideas/arcagate-engineering-principles.md` §9: ストレスがない / 壊れない の客観指標

## 横展開チェック実施済か

- batch-82 で idle memory は **未計測** とマーク
- sysinfo crate は SystemMonitor widget で active 中ずっと poll する設計
- メモリリーク懸念: 長時間使用での memory growth を確認していない

## 仕様

### 計測

```powershell
# 起動直後 30 秒、SystemMonitor widget 無し
Start-Process target/release/arcagate.exe
Start-Sleep -Seconds 30
$idle = Get-Process arcagate | Select-Object WorkingSet64, PrivateMemorySize64

# SystemMonitor widget あり 5 分後
# Workspace に SystemMonitor を追加した状態で再計測
Start-Sleep -Seconds 300
$with_sm = Get-Process arcagate | Select-Object WorkingSet64, PrivateMemorySize64
```

### sysinfo Mutex 戦略 review

`src-tauri/src/services/system_info.rs`（または該当ファイル）で:

- `Mutex<System>` で global instance を共有しているか
- `system.refresh_all()` の呼び出し頻度 vs 実際に必要な情報
- Workspace に SystemMonitor が無いなら sysinfo インスタンスを drop できるか

### 改善候補（計測後判断）

idle > 100 MB なら:

- WebView2 自体の baseline を確認（WebView2 が ~70 MB 占有なら避けようがない）
- Tauri/Rust 側の Mutex / cache を review
- フロント側の `$state` 蓄積（item history、widget state）を確認

idle ≤ 100 MB なら baseline 維持。

## 受け入れ条件

- [ ] 計測スクリプト `scripts/bench/idle-memory.ps1` 作成
- [ ] idle / SystemMonitor 有り の WS / PrivateMemorySize を performance-baseline.md に記録
- [ ] sysinfo の Mutex 戦略を `docs/l2_architecture/sysinfo-strategy.md` に文書化
- [ ] vision 目標（idle ≤ 100 MB）の達成判定
- [ ] `pnpm verify` 全通過

## SFDIPOT 観点

- **D**ata: メモリ使用量の正確な計測（WS vs PrivateMemorySize）
- **T**ime: 5 分使用後 vs 起動直後の差（リーク検出）
- **P**latform: Windows メモリ管理の癖（commit vs working set）
