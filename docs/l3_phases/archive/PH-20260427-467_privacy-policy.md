---
id: PH-20260427-467
status: done
batch: 105
type: 整理
era: Distribution Era Hardening
---

# PH-467: プライバシーポリシー文書化 (PRIVACY.md)

## 問題

Distribution Era 配布水準で「他人が使って・配布されて・販売されても問題ない」を満たすには、データ取扱方針の明示が必要。Codex Q4 の指摘 #2 (Privacy Policy 不在) への対応。

## 改修

1. `PRIVACY.md` 新規作成
   - Opt-in モデル明記 (デフォルト OFF)
   - 送信データ種別 (PH-465 Telemetry / PH-466 Crash) と送信外データの列挙
   - kill-switch (PH-468) の HTTP GET 仕様 (識別情報送信なし)
   - サードパーティ依存 (WebView2 / Tauri / GitHub)
   - データ削除手順
   - 連絡先 (GitHub Issues)
2. `README.md` に `## プライバシー` section 追加で PRIVACY.md リンク

## 受け入れ条件

- [x] PRIVACY.md 作成 (送信データ / 送信外データ列挙)
- [x] README.md に link 追加
- [x] Opt-in モデル明記 (PH-465/466 実装前提として整合)
- [x] kill-switch の HTTP GET 仕様明記

## 横展開チェック

- README.md の他 section と整合 → 整合
- L1 vision.md 配布水準と整合 → 整合
- 凍結された機能 (REQ-012/013) との不整合なし → なし
