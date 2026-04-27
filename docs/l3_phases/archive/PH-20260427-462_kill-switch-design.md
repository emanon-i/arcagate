---
id: PH-20260427-462
status: done
batch: 104
type: 整理
era: Distribution Era Hardening
---

# PH-462: kill-switch 設計 (Codex Q4 #6 補完)

## 問題

`docs/distribution-rollback-sop.md` (PH-458) §6 で「kill-switch (将来) は batch-104 以降で検討」と予告。本 plan で設計確定。

## 設計案

### Kill-switch とは

「特定 version (or 全 version) を起動時に強制無効化する仕組み」。
バグ release 公開後、即座にユーザの起動を止めて被害拡大を防ぐ。

### 実装方式 (3 候補)

#### A. GitHub Releases に `disabled.json`

- Release assets に追加 (各 release / latest)
- 起動時にアプリが latest.json と同じ endpoint から fetch
- フォーマット:

```json
{
  "disabled_versions": ["0.2.0"],
  "min_supported_version": "0.1.5",
  "message": "v0.2.0 にデータ破損問題があります。最新版にアップデートしてください。"
}
```

- 該当 version なら起動時 dialog → 強制終了 or read-only mode

**長所**: GitHub Releases に依存、追加サーバ不要、Updater と同じ pubkey で署名可能
**短所**: ファイル更新 = 新 release 作成必要 (or release edit)、即時性弱い

#### B. 専用 endpoint (Cloudflare Workers / GitHub Pages)

- `https://arcagate.dev/kill-switch.json` を WebView2 で fetch
- リアルタイム更新可能 (Workers KV / GitHub Pages JSON)
- pubkey 検証は別途実装

**長所**: 即時更新、コスト低 (CF Workers Free tier)
**短所**: 専用 infra 追加、サーバ管理負荷

#### C. ハイブリッド (推奨)

- GitHub Releases の `disabled.json` を primary
- フォールバックなし (single source of truth)
- 起動時 fetch 失敗なら無視 (offline でもアプリ起動可、kill-switch は best-effort)

**短所**: 即時性は GitHub Release の publish 速度依存 (~5 分)
**長所**: 既存 infra のみ、実装シンプル、署名統一

### 推奨

**A 方式 (GitHub Releases `disabled.json`)** を batch-105 以降で実装:

- `tauri-plugin-updater` と同じ endpoint pattern
- 公開鍵で署名 (既存 PH-455 鍵を流用)
- アプリ起動時 5 秒以内に fetch、disabled なら dialog
- 緊急時の運用手順を `distribution-rollback-sop.md` § 6 に追加

### 実装ステップ (別 plan)

1. `src-tauri/src/services/kill_switch_service.rs` 新設
2. 起動時 (lib.rs setup) で fetch + 判定
3. disabled なら `tauri::AppHandle.exit(0)` または read-only mode
4. UI: `src/lib/components/common/KillSwitchDialog.svelte` (受信時のみ表示)
5. Settings に「サーバチェックを無効化」(debug 用、デフォルト OFF)

### Privacy

- fetch 自体は他の Updater check と同様、IP のみ (匿名)
- ユーザ識別不可、Telemetry とは別経路

## 受け入れ条件

- [x] 実装方式 3 候補比較
- [x] 推奨 (A 方式 GitHub Releases `disabled.json`)
- [x] 実装ステップ概要 (別 plan で着手)
- [x] Privacy 配慮明示

## 別 plan に切り出し

- PH-470 (or 後続): kill-switch 実装本体
- PH-471: 緊急対応 SOP に kill-switch 操作手順追加
