---
id: PH-issue-007
title: フォントトークン化 — ハードコード禁止 + 既存スタイル尊重 (旧 PH-475 の過剰反応教訓)
status: planning
parent_l1: REQ-006_workspace-widgets
related: 旧 PH-475 (font tokens、batch-107 で実装も「全体的に劣化」原因の 1 つと user 指摘)、慎重に再構築
---

# Issue 7: フォントトークン化 (慎重再構築)

## 元 user fb (検収項目 #7)

> フォントサイズ / weight をトークン化、ハードコード禁止
> ⚠️ 過去 PH-475 で __全 widget に text-ag-_ を一斉適用_* → user 体感劣化 (xs:11px vs Tailwind default 12px、見出しと本文のコントラスト変化、文字が詰まって見える等)
> rollback で revert された経緯。**本 plan は scope を絞って慎重に**

## 引用元 guideline doc

| Doc                                                  | Section                            | 採用判断への寄与                                              |
| ---------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------- |
| `docs/l1_requirements/ux_standards.md`               | §4-2 タイポグラフィスケール        | 既存 8 段階 (text-xs から text-2xl) Tailwind default 維持     |
| `docs/l1_requirements/design_system_architecture.md` | §2-2 (`--ag-*` token 拡張方針)     | token を **追加**するが既存 Tailwind default を**置換しない** |
| `docs/desktop_ui_ux_agent_rules.md`                  | P12 (整合性) / P9 (画面密度)       | 局所的な独自性より既存トークン整合                            |
| `docs/lessons.md`                                    | "Guideline doc 不活用が劣化の主因" | 過剰反応で全置換しない、scope を明示                          |

## Fact 確認 phase

旧 PH-475 の問題:

- `app.css @theme inline` で `--text-ag-xs: 11px` (Tailwind default 12px と異なる) → 既存 widget のフォントが意図せず縮む
- 22 ファイルで `text-ag-*` 一斉適用 → 全体的に詰まって見える劣化体感

Goal A 時点 (rollback 後):

- `text-ag-*` token は **存在しない** (rollback で消えた)
- 各 widget は Tailwind default (`text-xs`, `text-sm` 等) を直接使用
- `--ag-text-{primary,secondary,muted,faint}` (色) は別途存在、これは色トークン

## UX 本質 phase

User 「ハードコード禁止」=

1. **font-size 数値直書き禁止** (例: `style="font-size: 13px"` のような直書き)、Tailwind class (`text-xs`) は OK (これは間接トークン)
2. **font-weight も同様** (Tailwind `font-medium` 等は OK、style 直書き NG)
3. **既存スタイルを置換しない** (旧 PH-475 の過剰反応を避ける)

→ 本 plan の scope:

- **lint / audit script** で `style="font-size:..."` や `text-[NNpx]` の直書きを検出
- **既存 `text-xs` 等は触らない** (Tailwind default 維持)
- **新規追加する場合のみ** `--ag-*` token を経由 (例: 大見出しに `var(--ag-font-display)` を新設、必要時のみ)

## 横展開 phase (慎重に scope を絞る)

| 領域                                    | 対応                                                                       |
| --------------------------------------- | -------------------------------------------------------------------------- |
| 既存 widget の `text-xs` / `text-sm` 等 | **触らない** (旧 PH-475 の失敗原因)                                        |
| 新規コンポーネント                      | `text-xs` 等の Tailwind default を使う (ハードコード `text-[11px]` は禁止) |
| audit script                            | `text-\[(\d+)px\]` パターンを検出 + `style="font-size` を検出 → CI fail    |

## Plan: 採用案 A: 「audit script のみ追加、既存スタイル維持」

- `scripts/audit-font-hardcode.sh` 新設:
  ```sh
  grep -rnE 'text-\[\s*[0-9]+px\s*\]|style=["\047][^"\047]*font-size' src/
  # ↑ violations 0 を要求
  ```
- lefthook pre-commit に統合
- 既存 svelte ファイルへの一括置換は **やらない** (旧 PH-475 の劣化原因)

## 棄却案 B: 「全 `text-xs` を `text-ag-xs` に置換 + token 定義」

- 旧 PH-475 と同じ過剰反応、user 体感劣化を再発させる
- → **明確に棄却** (lessons.md「過去の失敗パターン」)

## 棄却案 C: 「token 定義のみ追加、widget は手動移行」

- 部分的に token、部分的に Tailwind が混在 → 一貫性低下
- 移行するなら一括が筋だが、過去失敗があるので慎重に
- → 棄却 (本 plan は audit script のみ、移行は別 plan で慎重議論後)

## E2E スコープ外

audit script のみの追加なので E2E 不要。`pnpm verify` で audit が走り violations 0 を確認。

## 規格 update

`ux_standards §4-2 タイポグラフィスケール` に「**font-size のハードコード禁止 (style 直書き / `text-[Npx]` 禁止)**、Tailwind class または `--ag-*` token を経由」明記。

## 実装ステップ

1. `scripts/audit-font-hardcode.sh` 作成
2. 現状コードを scan、既存 violations をリスト化 (おそらく数件)
3. 既存 violations を 1 件ずつ修正 (Tailwind class に置換、token 新設は **しない**)
4. lefthook pre-commit に統合
5. `ux_standards §4-2` update
