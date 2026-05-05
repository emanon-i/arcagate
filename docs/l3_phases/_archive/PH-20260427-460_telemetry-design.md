---
id: PH-20260427-460
status: done
batch: 104
type: 整理
era: Distribution Era Hardening
---

# PH-460: Telemetry 最小実装 設計 (Codex Q4 #7)

## 問題

Codex Q4 #7: Telemetry / Crash 最小導入なし → 配布後の問題検知が手動報告のみ。

## 設計案 (実装は別 plan、本 plan は方針確定)

### スコープ (最小実装)

- **匿名 startup イベント**: バージョン / Windows ビルド / アーキ / WebView2 ランタイム version
- **重要操作カウント**: launch / palette open / search 件数 (個別アイテム情報なし、カウントのみ)
- **エラー集計**: AppError::code() ごとの発生回数

### スコープ外 (Privacy 配慮)

- 個別アイテム名 / path / クエリ内容
- ユーザ識別子 (UUID 含む)
- IP / 位置情報
- スクリーンショット

### 送信先候補

1. **GitHub Releases の opt-in form** (シンプル、専用サーバ不要)
   - 起動時に hash key で daily 1 回 POST
   - サーバ側で集計のみ
2. **Plausible / Umami** (privacy-first analytics、self-hosted 可)
3. **Application Insights** (Azure、enterprise 向け)
4. **PostHog** (open source、self-hosted)

最有力: **PostHog (self-hosted)** か Plausible。匿名性 + EU GDPR 準拠 + 低コスト。

### Opt-in / Opt-out

- **デフォルト Opt-out** (送信しない)
- Settings > データ > 「匿名統計を送信」トグル
- Opt-in 時のみ送信

### 実装ステップ (別 plan で着手予定)

1. PostHog (or 代替) 選定 + self-hosted セットアップ
2. Rust 側 telemetry crate 導入 (`reqwest` + serde_json で最小実装も OK)
3. Settings UI 追加 (opt-in トグル)
4. プライバシーポリシー drafted (README.md)

## 受け入れ条件

- [x] スコープ定義 (送信内容 / 送信外)
- [x] 送信先候補比較
- [x] Opt-in 設計 (デフォルト OFF)
- [x] 実装ステップ概要 (別 plan で着手)

## 別 plan に切り出し

- PH-466 (or 後続): Telemetry 実装本体 (PostHog / 自前 endpoint 選定後)
- PH-467: プライバシーポリシー文書化
