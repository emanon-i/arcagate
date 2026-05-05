# i18n Hardcode Baseline — 2026-05-04 / R9-C update 2026-05-05

**Method**: `bash scripts/audit-i18n-hardcode.sh` で計測。

## R7-4 baseline → R9-C 現状

| 種別                 | R7-4 件数 | R9-C 件数 | 差分   |
| -------------------- | --------- | --------- | ------ |
| aria-label="..."     | 84        | 86        | +2     |
| title="..."          | 29        | 29        | 0      |
| placeholder="..."    | 25        | 25        | 0      |
| text content (>...<) | 157       | 159       | +2     |
| **合計**             | **295**   | **299**   | **+4** |

差分 (+4) は R8 cycle (#308 a11y audit / #315 Workspace 5sec undo snackbar) で増えた分。

## R9-C: budget gate 化

`audit-i18n-hardcode.sh` を **informational → CI gate** に転換。

```bash
MAX_HARDCODE=299  # 現状で freeze、regression 防止
```

- 新規 PR で 299 を超える hardcoded 文字列が追加されると **CI fail**
- 既存数を減らした PR では `MAX_HARDCODE` を新しい数値に **下げる**
- 段階的に L4 完了で `MAX_HARDCODE = 0` にする

## 段階方針

| Phase           | gate 条件                       | 切替                           |
| --------------- | ------------------------------- | ------------------------------ |
| **1 (R7-4)**    | informational のみ              | 既定 OFF                       |
| **2 (R9-C 本)** | `total ≤ MAX_HARDCODE` (= 299)  | regression 防止、現状を freeze |
| **3 (L4 着手)** | `MAX_HARDCODE` を段階的に下げる | i18n key 化された分を migrate  |
| **4 (L4 完了)** | `MAX_HARDCODE = 0`              | 全文字列 t() 経由              |

## 何を「i18n key 化」 するか (L4 計画スケッチ)

1. **aria-label / title** (115 件): 共通 keys.ts に集約 (`labels.actions.close = '閉じる'` 等)
2. **placeholder** (25 件): form 系 component の placeholder を i18n に
3. **text content** (159 件): 段階的、widget / component ごとに移行
4. svelte-i18n / Paraglide 等の lib 採用は L4 着手時に bundle size + DX 評価で決定

## 利用方法

- CI に組込み済 (R9-C で gate 化、`total > MAX_HARDCODE` で fail)
- 新規 PR で hardcoded 文字列を追加したら audit が落ちる → 既存集約か budget 上げか選択
- 削減 PR では `scripts/audit-i18n-hardcode.sh` の `MAX_HARDCODE=N` を下げて commit
