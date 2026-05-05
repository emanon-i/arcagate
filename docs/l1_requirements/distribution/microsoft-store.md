# Microsoft Store 提出 手順書 (R10-Y)

**Status**: 2026-05-05 user 4 step + agent 自動配置済の hybrid
**Scope**: arcagate を Microsoft Store に Win32 listing として提出する flow
**Cost**: **$0** (2026 個人 / 法人 双方の登録費用は 0、subscription なし、初回のみの ID 確認で無期限 publish 可能)

---

## 1. なぜ Microsoft Store か (cost / benefit)

| 項目                 | 直配布 (GH Releases)        | MS Store (Win32 listing)                                 |
| -------------------- | --------------------------- | -------------------------------------------------------- |
| 登録費用             | $0                          | **$0** (2026、新 onboarding flow)                        |
| 維持費               | $0                          | $0 (subscription なし)                                   |
| SmartScreen 警告     | 出る (Authenticode 未署名)  | 出る ※ Tauri は EXE/MSI 提出のため軽減のみ、消滅はしない |
| user discoverability | repo / 直リンクのみ         | Store 検索 / 推薦                                        |
| update 機構          | Tauri updater (Tier 1 待ち) | Tauri updater 継続 (MS Store は配信のみ、re-sign しない) |

**結論**: $0 で Store discoverability を得る価値はある。ただし Tauri が MSIX を emit しないため SmartScreen は完全には消えない (= EXE/MSI 直配布と同等の reputation 蓄積が必要)。

参照: https://learn.microsoft.com/en-us/windows/apps/publish/partner-center/open-a-developer-account

> "With the new onboarding experience, there are no registration fees for either account type, so you can create your developer account and start publishing at no cost."

## 2. Tauri v2 + Store の前提 (公式 doc に基づく)

参照: https://v2.tauri.app/distribute/microsoft-store/ (2025-03-29 更新)

> "Currently Tauri only generates EXE and MSI installers, so you must create a Microsoft Store application that only links to the unpacked application."

**確定事項**:

- Tauri v2 は **MSIX を emit しない** (`bundle.targets` に `msix`/`appx` なし、`deb / rpm / appimage / nsis / msi / app / dmg` のみ)
- Store 提出は **EXE/MSI listing path** (Win32 app 提出) を使う
- `tauri.microsoftstore.conf.json` で `webviewInstallMode.type = "offlineInstaller"` を上書き必須 (Store ポリシー: online installer 不可)
- updater は Tauri 自前 (Tier 1 minisign) を継続、Store は配信媒体のみ (re-sign しない)

## 3. 必要な user 作業 (4 step、agent 代行不可)

すべて Microsoft 側 GUI / 個人情報入力が必要。`docs/l1_requirements/distribution/pubkey-procedure.md` と同様に **agent が `cd` 経由で代行できない** タスク。

### Step 1: Microsoft アカウント (MSA) 用意 (~5 min)

既存の Outlook / Hotmail / Live アカウントで OK。なければ新規作成:
https://account.microsoft.com/

### Step 2: Partner Center 個人開発者アカウント登録 (~10 min、$0)

1. https://storedeveloper.microsoft.com/ ← **新 onboarding flow の入口** (旧 Partner Center 直アクセスは旧課金 flow に流れるため避ける)
2. "Get started for free" → Individual developer
3. MSA でサインイン
4. **政府発行 ID + selfie で本人確認** (mobile camera 経由)
5. 自動入力された profile を確認 → "Go to Partner Center dashboard"

注意: 本 step では tax / 銀行情報は不要 (paid app / IAP / 広告で収益化するときのみ後で要求される)。日本居住者の W-8BEN 提出も同様、無料 app だけなら不要。

### Step 3: app 予約 + Identity 確定 (~5 min)

1. Partner Center → "Create a new product" → "EXE or MSI app"
2. App name 予約: 例 `Arcagate` (一意、12 営業日保持)
3. Partner Center が **publisher CN string** (例 `CN=12345678-1234-1234-1234-123456789012`) を自動発行 → 後で `tauri.microsoftstore.conf.json` の `bundle.publisher` に反映 (agent PR で対応可能)

### Step 4: 提出 (~30 min、 review 約 3 営業日)

1. CI で `pnpm tauri build --config src-tauri/tauri.microsoftstore.conf.json` で生成された MSI / EXE を upload
2. 必要 metadata (description / screenshot / icon / category) を入力
3. submit → MS 側 review (typical 1-3 営業日)
4. 通過後、Store listing が公開

参照: https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/app-certification-process

## 4. agent 完遂可能な配置作業 (R10-Y で実装)

`tauri.microsoftstore.conf.json` overlay と release.yml step は agent が PR で起票可能 (R10-Y 本 PR で配置済)。

### 4-1. `src-tauri/tauri.microsoftstore.conf.json` 雛形

```jsonc
{
  "bundle": {
    "windows": {
      "webviewInstallMode": {
        "type": "offlineInstaller"
      }
    }
  },
  "plugins": {
    "updater": {
      "active": true
    }
  }
}
```

`bundle.publisher` は user が Step 3 で取得した CN を反映する PR (agent 起票可)。

### 4-2. `release.yml` Store build step

```yaml
- name: Tauri build (Microsoft Store config overlay)
  run: pnpm tauri build --config src-tauri/tauri.microsoftstore.conf.json
```

通常 release artifact (MSI/NSIS) と Store 用 artifact は同じ build process を使えるため、本 step は **手動 trigger / 別 workflow で実行** (毎 release tag push で Store 提出する想定はないため)。

### 4-3. icon 補完 (Wide310x150 / SplashScreen は手動)

Tauri が自動生成する `src-tauri/icons/` は Square* + StoreLogo を網羅するが、Store 推奨の Wide310x150 / SplashScreen 620x300 は欠落。本 R10-Y では PR で placeholder を追加する余地がある。

## 5. SmartScreen の扱い (重要、過度な期待禁止)

Tauri docs / Microsoft docs ともに「Store distribution = SmartScreen 警告消滅」 を **明示的に保証していない**。

- 真の MSIX (Microsoft が re-sign) なら SmartScreen は信頼する
- 本 path (Tauri EXE/MSI 提出 = developer's own Authenticode) は **Microsoft が re-sign しない** ため、SmartScreen は developer cert reputation で判定
- 結果: Authenticode cert を別途取得しない限り、Store 経由 install でも警告は **完全には消えない**

→ SmartScreen 完全解消が必須なら R11+ で **本格的 MSIX path** (makeappx + signtool 自前) に進むか、**Authenticode 証明書購入** を検討。当面は Store discoverability を取りに行く。

## 6. 提出時の典型 rejection 原因

参照: https://learn.microsoft.com/en-us/windows/apps/publish/store-policies

1. **WACK (Windows App Certification Kit) failure** — automated test、locally 事前実行で防げる
2. **malware / virus 検知** — false positive あり、submit 前に self-scan
3. **Store policy 違反** — 特に dependency on non-Microsoft drivers / unjustified restricted capabilities

EXE/MSI 提出では **manifest capabilities が無い** (Win32 直接実行) ため、capability gate は無関係。

## 7. updater 共存 (Tauri updater + Store)

Tauri 公式 doc:

> "The installer linked in the Microsoft Installer must be offline, **handle auto-updates** and be code signed."

**Tauri updater (Tier 1 minisign) を継続**。Store は配信のみで re-sign しないため、updater 経路は GH Releases から直接 fetch する従来通り。

注意: 真の MSIX path に切替えると Store policy 10.8 で **app 内 updater 動作禁止** になる。本 EXE/MSI path では問題なし。

## 8. 出典

- MS Store onboarding (free): https://learn.microsoft.com/en-us/windows/apps/publish/partner-center/open-a-developer-account
- New flow entry: https://storedeveloper.microsoft.com/
- Tauri v2 Store guide: https://v2.tauri.app/distribute/microsoft-store/
- Cert process timeline: https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/app-certification-process
- Store policies: https://learn.microsoft.com/en-us/windows/apps/publish/store-policies
- MSIX 一般: https://learn.microsoft.com/en-us/windows/msix/

## 9. agent 代行可 / user 必須 表

| step                                                               | agent 代行                   | user 必須                  |
| ------------------------------------------------------------------ | ---------------------------- | -------------------------- |
| Microsoft account 作成                                             | NG                           | ✅                         |
| Partner Center 登録 (ID 確認 / selfie)                             | NG                           | ✅                         |
| Publisher CN 取得                                                  | NG (Partner Center 自動発行) | ✅                         |
| `tauri.microsoftstore.conf.json` 作成 / `bundle.publisher` 反映 PR | ✅                           | review                     |
| `release.yml` Store build step wiring                              | ✅                           | review                     |
| icon (Wide310x150 / SplashScreen) placeholder 追加 PR              | ✅                           | review (実 design は user) |
| MSI/EXE artifact upload to Partner Center                          | NG (GUI)                     | ✅                         |
| Description / screenshot 入力                                      | NG (GUI)                     | ✅                         |
| 提出 → review pass                                                 | NG (MS review)               | ✅                         |

R10-Y で agent は **Step 4-1 ~ 4-3 の配置作業** を完遂、残りは user GUI 操作 4 step。

## 10. 次のフェーズ判定

R10-Y 完了で:

- **agent 完遂可能な MS Store 準備は配置完了** (config overlay + release.yml step + 手順書)
- user が Step 1-3 を完了したら、Step 4-1 の `bundle.publisher` PR を agent が起票可能
- user が Step 4 GUI 提出を実施 → review pass で Store 公開

R11+ 候補:

- 真の MSIX path (makeappx + AppxManifest.xml 自前) で SmartScreen 完全解消
- Authenticode 証明書購入 ($100-300/year、user judgment、現状は subscription NG ルールに抵触の可能性あり)

R10 完了 = **distribution era 完了に必要な agent 側準備を全て配置済**。
