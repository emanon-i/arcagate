---
id: PH-20260426-326
status: todo
batch: 74
type: 改善
---

# PH-326: ボタンラベル audit を機械化（pre-commit + CI に組み込み）

## 横展開チェック実施済か

- batch-67 で `scripts/audit-labels.sh` を作成済だが pre-commit / CI 未統合 → 「書いて満足」状態
- engineering-principles §1: 「規約より機械検証」 — このルールが守られていない

## 仕様

- `scripts/audit-labels.sh` を強化（aria-label / button text に Lucide アイコン名を含むケースを検出）
- 検出パターン: `aria-label="(Star|Plus|X|Trash|Pencil|Edit|Settings|Search|Folder|File|Check|Clock|Activity|Clipboard)\s*"` 等
- lefthook pre-commit に `label-audit` step を追加（svelte ファイルのみ対象、stage_fixed 不要）
- exit 1 で commit 阻止
- 既存違反は本 Plan 内で全件修正

## 受け入れ条件

- [ ] audit-labels.sh が単体実行で違反 0 件を返す
- [ ] lefthook pre-commit に label-audit step 統合
- [ ] テスト用に意図的違反を入れて `lefthook run pre-commit` で fail することを確認
- [ ] `pnpm verify` 全通過
