---
id: PH-20260427-455
status: held
batch: 103
type: 改善
era: Distribution Era Hardening
---

# PH-455: Updater pubkey 本番化 (Codex 4 回目 Critical #1)

## 問題

`tauri.conf.json plugins.updater.pubkey` が `PLACEHOLDER_REGENERATE_WITH_TAURI_SIGNER`。Updater 信頼連鎖が機能しない。

## 改修

1. `npm run tauri signer generate -- -w ~/.tauri/arcagate.key` で鍵 pair 生成
2. `pub.key` の内容を `tauri.conf.json plugins.updater.pubkey` に embed
3. 秘密鍵を GitHub Secret `TAURI_SIGNING_PRIVATE_KEY` (base64) + `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` に登録
4. RELEASE.md に鍵生成手順 + 管理ルール追記

## 受け入れ条件

- [ ] tauri signer generate で鍵生成 (ユーザ実行、本 plan は手順記載のみ)
- [ ] tauri.conf.json pubkey 更新
- [ ] GitHub Secret 登録 (ユーザ実行)
- [ ] RELEASE.md 鍵生成手順拡充
- [ ] `pnpm verify` 全通過

## 注意

ユーザの鍵生成 + Secret 登録が必要なため、本 plan は **手順整備 + ユーザへの実行依頼まで** で完了。実鍵での署名動作確認は別 plan。
