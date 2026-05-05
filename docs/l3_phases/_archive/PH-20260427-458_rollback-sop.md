---
id: PH-20260427-458
status: todo
batch: 103
type: 防衛
era: Distribution Era Hardening
---

# PH-458: Rollback / kill-switch SOP

## 問題

Codex Rule C 4 回目 Q4 #6: Rollback / kill-switch SOP が未定義。バグ release 公開後の緊急対応手順が無い。

## 改修

`RELEASE.md` の「ロールバック」section を SOP として拡充:

1. **検知**: ユーザ報告 / クラッシュ率 spike / dispatch-log 異常で発覚
2. **判断 (5 分以内)**:
   - 軽微: hotfix release 待ち (24h 以内)
   - 重大: 即 rollback
3. **rollback 手順**:
   - GitHub Releases で問題 release を Draft / Pre-release に降格
   - 1 つ前の release を最新に再昇格 (tag 操作なし、release 設定のみ)
   - 既存ユーザの Updater は新版表示なし → 自動 downgrade されない (既存版維持)
4. **kill-switch (将来)**: server-side 設定で「強制無効化」する仕組みを batch-104 以降で検討

## 受け入れ条件

- [ ] RELEASE.md ロールバック section を SOP 化
- [ ] 検知 → 判断 → 実行 → 事後分析 のフロー明文化
- [ ] kill-switch 設計案を batch-104 候補としてメモ
- [ ] `pnpm verify` 全通過
