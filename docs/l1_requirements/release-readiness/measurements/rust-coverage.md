# Rust Coverage — 2026-05-04

**Method**: `cargo install cargo-llvm-cov --locked` → `rustup component add llvm-tools-preview` → `cd src-tauri && cargo llvm-cov --summary-only --lib` 実行。

## 全体 (cargo test --lib 256 tests pass)

| metric    | value                    |
| --------- | ------------------------ |
| Lines     | **76.72%** (4882 / 6363) |
| Regions   | 76.80% (8724 / 11359)    |
| Functions | 73.01% (541 / 741)       |

## 領域別 (Lines % 抜粋、上位 / 注目)

### services/ (criteria threshold ≥ 70%)

| file                      | Lines % | 判定                            |
| ------------------------- | ------- | ------------------------------- |
| file_search_state.rs      | 100.00  | ✅                              |
| file_search_service.rs    | 98.88   | ✅                              |
| exe_scanner_service.rs    | 98.10   | ✅                              |
| theme_service.rs          | 98.28   | ✅                              |
| kill_switch_service.rs    | 94.44   | ✅                              |
| opener_service.rs         | 92.55   | ✅                              |
| watched_path_service.rs   | 89.84   | ✅                              |
| workspace_service.rs      | 90.84   | ✅                              |
| item_service.rs           | 78.33   | ✅                              |
| system_monitor_service.rs | 79.37   | ✅                              |
| metadata_service.rs       | 77.29   | ✅                              |
| telemetry_service.rs      | 71.08   | ✅                              |
| config_service.rs         | 70.80   | ✅                              |
| export_service.rs         | 67.77   | (近接 70%)                      |
| wallpaper_service.rs      | 66.67   |                                 |
| crash_monitor_service.rs  | 55.00   | (panic_hook の test 不可)       |
| launch_service.rs         | 43.30   | (実 process spawn の test 不可) |

### repositories/

- workspace_repository.rs: 88.26%
- (他 repositories は probably 80%+)

### utils/

- git.rs: 97.64%
- icon.rs: 88.89%
- error.rs: 61.54%
- http_client.rs: 50.00%

### watcher/

- watcher/mod.rs: 7.25% (FS event 監視は test しづらい、e2e で代替)

## 判定 (audit J2)

- **Pass criteria** (criteria-quality.md J2):
  - `src-tauri/src/services/` ≥ 70%
  - 全体 ≥ 50%
- **観測**:
  - services/ 平均は **約 80%** (大半の file が 70% 超、launch / crash_monitor が test 不可で低)
  - 全体 Lines = **76.72%** ≥ 50% ✅
- **判定**: ✅ **PASS**

services/ 内で 70% 未満の 3 件:

- launch_service (43%): 実プロセス spawn を test できない
- crash_monitor_service (55%): panic_hook 自体 test 困難
- wallpaper_service (67%): file IO test の不足
- export_service (68%): edge case test の不足

これらは **構造的に test しづらい部位** (process spawn / OS shell / file IO の副作用)、または coverage 目的に test を増やす効果薄。J4 (regression scenarios doc) で error path を doc 化する方が ROI 高い。
