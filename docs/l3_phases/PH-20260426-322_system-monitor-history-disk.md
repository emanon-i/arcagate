---
id: PH-20260426-322
status: done
batch: 73
type: 改善
---

# PH-322: SystemMonitor 履歴 sparkline + ディスク容量

## 横展開チェック実施済か

- 履歴データはフロント側で保持（Rust 側は最新値のみ）→ Service Layer 一方向依存維持
- sparkline は SVG 直書き（chart lib 追加なし、依存予算節約）

## 仕様

- フロント: 直近 60 サンプル（=2 秒 polling × 60 で 2 分）を `$state` で保持
- 簡易 sparkline（SVG polyline 1 本）で CPU 履歴可視化
- Rust IPC `cmd_get_disk_stats()` → `Vec<{ mount: String, used_bytes: u64, total_bytes: u64 }>`
- ディスク表示は WidgetSettings の `show_disk` トグルで ON/OFF

## 受け入れ条件

- [ ] sparkline 60 点描画、最古サンプルが切り捨てられる
- [ ] cmd_get_disk_stats 単体テスト（少なくとも 1 ボリューム検出）
- [ ] show_disk トグルで disk セクション表示切替
- [ ] `pnpm verify` 全通過
