# i18n Hardcode Baseline — 2026-05-04

**Method**: `bash scripts/audit-i18n-hardcode.sh` で計測。

| 種別                 | 件数    |
| -------------------- | ------- |
| aria-label="..."     | 84      |
| title="..."          | 29      |
| placeholder="..."    | 25      |
| text content (>...<) | 157     |
| **合計**             | **295** |

## 判定 (audit H1 / H4)

- **現 phase**: 日本語固定で意図的 (criteria-quality.md H2/H3/H4 で明記)
- **本 audit の役割**: informational baseline。CI で WARN のみ、gate ではない
- **将来**: L4 多言語化フェーズで gate 化、本数値を baseline に固定 → 新規 PR で増加検出 → 新規分は i18n key (`$t('key.path')` 等) 経由を強制
- **判定**: H1 / H4 は **N/A 維持** (criteria 設計通り)、本 baseline は L4 着手時の参照として保存

## 何を「i18n key 化」 するか (L4 計画スケッチ)

1. **aria-label / title** (113 件): 共通 keys.ts に集約 (`labels.actions.close = '閉じる'` 等)
2. **placeholder** (25 件): form 系 component の placeholder を i18n に
3. **text content** (157 件): 段階的、widget / component ごとに移行
4. svelte-i18n / Paraglide 等の lib 採用は L4 着手時に bundle size + DX 評価で決定

## 本 audit の利用方法

- CI に組込み済 (informational 表示のみ、exit 0)
- L4 で gate 化するときは:
  ```bash
  # 例: baseline 比較で増加検出
  CURRENT=$(bash scripts/audit-i18n-hardcode.sh | awk '/total:/{print $2}')
  if [ "$CURRENT" -gt 295 ]; then exit 1; fi
  ```
