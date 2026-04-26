# 性能 baseline（batch-82 PH-368 / Refactor Era 計測フェーズ）

計測日: 2026-04-26
**コード変更なし、計測のみ**

vision.md 制約:

- exe size: **20MB 以下**
- idle メモリ: **100MB 以下**
- 起動 P95: **2 秒以内**

---

## 1. exe size（release ビルド）

```
src-tauri/target/release/arcagate.exe = 17,238,016 bytes (16.44 MB)
```

| 制約          | 実測         | 余裕     | 達成度              |
| ------------- | ------------ | -------- | ------------------- |
| exe size 20MB | **16.44 MB** | +3.56 MB | ✅ 達成（82% 使用） |

batch-73 で sysinfo 追加後の値、その後変動なし。

### バイナリ寄与（cargo bloat、arcagate_cli の場合）

```
text section: 2.5 MiB / file size 3.1 MiB
```

| crate                        | 寄与            |
| ---------------------------- | --------------- |
| (root + dependencies inline) | 49.4% (1.2 MiB) |
| clap_builder                 | 12.8% (322 KiB) |
| std                          | 10.5% (265 KiB) |
| arcagate_cli                 | 9.8% (246 KiB)  |
| serde_json                   | 4.3% (109 KiB)  |
| arcagate_lib                 | 3.3% (83 KiB)   |
| libsqlite3_sys               | 2.6% (64 KiB)   |
| serde_core                   | 1.7% (41 KiB)   |
| rusqlite                     | 1.1% (27 KiB)   |
| rusqlite_migration           | 0.9% (23 KiB)   |

GUI 本体（arcagate.exe）の cargo bloat は次フェーズで詳細測定。**clap_builder が CLI で 322 KiB は妥当**（GUI バイナリには不要なはず → 性能フェーズで分離検討候補）。

---

## 2. idle メモリ（**未計測**）

実機起動 + 5 分待機後の `Get-Process arcagate | Select-Object WorkingSet,PrivateMemorySize` 計測が必要。

batch-83 構造フェーズ着手前にユーザ環境で実機計測予定。

| 制約       | 実測       | 達成度 |
| ---------- | ---------- | ------ |
| idle 100MB | **未計測** | —      |

---

## 3. 起動時間 P95（**未計測**）

ホットキー押下 → パレット表示までの実機計測が必要。手動 5 回 → P95 算出。

| 制約          | 実測       | 達成度 |
| ------------- | ---------- | ------ |
| 起動 P95 2 秒 | **未計測** | —      |

---

## 4. フロントバンドル

`docs/l2_architecture/bundle-baseline.md`（batch-63）から:

| 区分     | サイズ (raw) | サイズ (gzip) |
| -------- | ------------ | ------------- |
| JS 合計  | 428 KB       | 134 KB        |
| CSS 合計 | 100 KB       | 16 KB         |
| **合計** | **556 KB**   | **150 KB**    |

batch-82 時点では大きな変動なし（vite-bundle-visualizer 再実行は構造フェーズで）。

### JS チャンク top 5

| ファイル                | サイズ   |
| ----------------------- | -------- |
| `nodes/2.*.js` (メイン) | 302.9 KB |
| `chunks/BSyGwTi_.js`    | 36.2 KB  |
| `chunks/CDk8TfDx.js`    | 26.1 KB  |
| `chunks/CC-iDZOB.js`    | 23.8 KB  |
| `nodes/3.*.js`          | 18.5 KB  |

メインチャンク 302 KB は Svelte コンパイル済 + 全 widget が乗っている可能性あり（folder-per-widget colocation 後に dynamic import で削減可能）。

---

## 5. テストスイート実行時間（batch-82 計測）

| スイート          | ファイル数                | テスト数 | 実行時間（ローカル）         |
| ----------------- | ------------------------- | -------- | ---------------------------- |
| vitest            | 11                        | 104      | ~1.9 秒                      |
| cargo test --lib  | 約 30 module              | 176      | ~1.2 秒                      |
| pre-push 並列     | svelte-check + cargo test | —        | ~10〜18 秒                   |
| smoke-test        | shell-based               | —        | ~2 秒                        |
| pnpm verify 全部  | (フル)                    | —        | ~5〜8 分（tauri build 込み） |
| e2e @core (CI)    | 5 spec                    | 5 test   | 5〜8 分                      |
| e2e @nightly (CI) | 22 spec                   | 約 80+   | 15〜25 分                    |

---

## 6. Refactor Era 性能フェーズ（batch-85）改善対象

| # | 対象                    | 現在     | 目標     | 手段                                                         |
| - | ----------------------- | -------- | -------- | ------------------------------------------------------------ |
| 1 | exe size                | 16.44 MB | < 16 MB  | tauri features 削減 / cargo bloat 上位の review              |
| 2 | idle memory             | 未計測   | < 100 MB | sysinfo Mutex<System> 戦略の見直し（再生成 vs 保持）         |
| 3 | バンドル メインチャンク | 302 KB   | < 200 KB | folder-per-widget colocation 後に widget 単位 dynamic import |
| 4 | 起動 P95                | 未計測   | < 2 秒   | Tauri WebView2 起動時間（測定後判断）                        |
| 5 | e2e @core 実行時間      | 5〜8 分  | 維持     | 削減困難（page fixture setup が支配的）                      |
| 6 | テスト pre-push 時間    | 18 秒    | 維持     | OK                                                           |

**性能フェーズは構造 / 簡素化フェーズの完了後に実測再計測してから着手。**
