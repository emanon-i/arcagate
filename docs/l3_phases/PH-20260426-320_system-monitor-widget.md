---
id: PH-20260426-320
status: todo
batch: 73
type: 改善
---

# PH-320: SystemMonitorWidget（CPU / メモリ表示）

## 横展開チェック実施済か

- batch-69〜72 と同じ手順（Rust IPC + service + フロント widget + Sidebar / Settings / Layout 4 箇所同期）
- batch-72 で確立した「純粋関数を ts ファイルに切り出して vitest」パターン踏襲
- 依存予算（vision: exe 20MB / idle 100MB）→ sysinfo 追加前後で `cargo bloat --release --crates -n 10` 実機計測

## 仕様

- Rust IPC `cmd_get_system_stats()` → `{ cpu_percent: f32, mem_used_bytes: u64, mem_total_bytes: u64 }`
- `sysinfo` crate 追加（features は `system` のみ、不要 module disable で size 抑制）
- `services/system_monitor_service.rs` で `System::new_all().refresh_cpu().refresh_memory()` を実行
- フロントは `setInterval` で polling（refresh_interval_ms 既定 2000ms、500〜10000 でクランプ）
- WidgetShell + menuItems 1「設定」即モーダル原則準拠

## 受け入れ条件

- [ ] cmd_get_system_stats 単体テスト（refresh 後 cpu_percent 0..=100, mem_used <= mem_total）
- [ ] フロント: SystemMonitorWidget レンダリング、polling 動作
- [ ] sysinfo 追加後の release バイナリサイズが 20MB 以下を維持（実機計測で記録）
- [ ] `pnpm verify` 全通過
