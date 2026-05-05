---
id: PH-20260427-459
status: done
batch: 104
type: 整理
era: Distribution Era Hardening
---

# PH-459: SmartScreen reputation 戦略文書化 (Codex Q4 #5)

## 問題

Windows 配布で SmartScreen 警告が出ると初動離脱率が上がる。証明書種別 + reputation 蓄積戦略を明文化。

## 改修

`docs/distribution-readiness.md` § 9 SmartScreen 節を拡充 + 本 plan 文書で戦略確定。

### 証明書種別比較

| 種別                  | 価格        | SmartScreen 即時  | 推奨                       |
| --------------------- | ----------- | ----------------- | -------------------------- |
| EV コード署名         | 年 $300-500 | ✅ 即時           | 商用本気なら               |
| OV コード署名         | 年 $100-200 | ❌ 蓄積必要       | 個人 / 趣味                |
| Azure Trusted Signing | 月 $9.99    | ✅ Microsoft 署名 | 安価で SmartScreen 即時 ⭐ |
| 未署名                | 無料        | ❌ 警告           | 配布不可水準               |

### Reputation accumulate 計画 (OV 選択時)

- インストール数 / 経過時間 / 同一 thumbprint 連続 release で reputation 蓄積
- v0.2.0 OV release で最低 1〜3 ヶ月の蓄積期間を見込む
- 期間中はユーザに「詳細情報 → 実行」操作を依頼 (INSTALL.md に記載済)

### 推奨選択

batch-104 時点では **Azure Trusted Signing** を最有力候補:

- 月 $9.99 で EV 同等の SmartScreen 即時有効
- Microsoft 管理鍵 = local 鍵紛失リスクなし
- GitHub Actions 連携 dedicated action あり

ユーザ判断 (PC 前到着時):

1. EV (商用本気) → Sectigo / DigiCert
2. Azure Trusted Signing (推奨) → Microsoft Partner Center 経由
3. OV (低コスト) → 蓄積期間覚悟で

## 受け入れ条件

- [x] 証明書種別比較表
- [x] reputation accumulate 計画 (OV 選択時)
- [x] 推奨選択明示 (Azure Trusted Signing)
- [x] ユーザ判断材料を `distribution-readiness.md` に統合 (本 plan で参照)
