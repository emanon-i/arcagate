# Cosign Keyless 配布元検証 手順書 (R10-X、Tier 2)

**Status**: 2026-05-05 agent 完全自動 (user 作業 0)
**Scope**: arcagate release artifact の **配布元 attestation** (Tier 2、Tier 1 minisign updater 検証とは独立した信頼レイヤー)

---

## 1. なぜ cosign を追加したか (Tier 1 / Tier 2 の役割分担)

| Tier             | 仕組み                                  | 検証する対象                                                                                              | user 作業                                             |
| ---------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| **1**            | minisign Ed25519 (Tauri updater)        | auto-update 経路で配信される binary が repo owner の秘密鍵で署名されているか                              | 鍵生成 + GH Actions secret 登録 (pubkey-procedure.md) |
| **2 (本 R10-X)** | cosign keyless (Sigstore + GitHub OIDC) | release artifact が **本 repo の release.yml workflow から自動生成されたか** (= GitHub OIDC subject 検証) | **0 (CI が自動)**                                     |

**独立した信頼レイヤー**: Tier 1 を skip して manual install する user でも Tier 2 で「**本 repo の workflow が作った artifact** であること」を再現検証できる。Tier 1 が user 作業待ちでも Tier 2 だけ即時運用可能。

参照: https://docs.sigstore.dev/cosign/signing/overview/

## 2. cosign keyless の仕組み (Sigstore)

```
release tag push (v0.2.0)
  ↓
GitHub Actions release.yml runs
  ↓
GitHub mints OIDC token (sub claim 含む job_workflow_ref:
  https://github.com/<owner>/<repo>/.github/workflows/release.yml@refs/tags/v0.2.0)
  ↓
cosign sign-blob --yes が OIDC token を Sigstore Fulcio に提示
  ↓
Fulcio が **約 10 分有効の短期 X.509 cert** を発行 (subject に OIDC claim を埋込)
  ↓
cosign が ephemeral 秘密鍵で blob に署名 → cert + sig + Rekor 包含 proof を bundle に packing
  ↓
Rekor transparency log にエントリが publish (公開 ledger、後から改竄不可)
  ↓
ephemeral 秘密鍵は破棄 (cosign keyless = no long-term key on disk)
  ↓
artifact + bundle JSON が GH Releases にアップロード
```

検証時: bundle 内の cert は Rekor 包含時刻が「cert 有効期間内」だったかで判定するので、cert 有効期間 (10 min) を過ぎても検証は永続的に成立する。

参照: https://docs.sigstore.dev/cosign/signing/signing_with_blobs/ / https://docs.sigstore.dev/cosign/verifying/verify/

## 3. user の手動検証手順 (任意、配布元同一性を疑うとき)

### 必要なもの

- [cosign CLI](https://docs.sigstore.dev/cosign/installation/) (Windows: `winget install Sigstore.Cosign` または GitHub release から `.exe` 取得)
- インターネット接続 (Rekor / Fulcio root cert を fetch するため)

### 手順

1. GH Releases から artifact + 対応する `<artifact>.sigstore.json` を**両方**ダウンロード:
   - 例: `arcagate_0.2.0_x64_en-US.msi` と `arcagate_0.2.0_x64_en-US.msi.sigstore.json`
   - `SHA256SUMS.txt` と `SHA256SUMS.txt.sigstore.json` も同様

2. cosign verify-blob 実行:

   ```bash
   cosign verify-blob \
     --bundle arcagate_0.2.0_x64_en-US.msi.sigstore.json \
     --certificate-identity-regexp "^https://github.com/emanon-i/arcagate/\.github/workflows/release\.yml@refs/tags/.*$" \
     --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
     arcagate_0.2.0_x64_en-US.msi
   ```

3. 成功時の output (cosign v2):

   ```
   Verified OK
   ```

   失敗時 (cert identity 不一致 / signature mismatch / Rekor 未登録) は exit code 非 0 + 詳細 message。

### 厳密化: 特定 tag のみ許容したい場合

```bash
--certificate-identity "https://github.com/emanon-i/arcagate/.github/workflows/release.yml@refs/tags/v0.2.0"
```

regexp 版は任意 tag で pass、identity 厳密版は v0.2.0 のみ pass。

## 4. GH Actions OIDC subject claim の構造

GitHub OIDC token の `sub` field は trigger により異なる (https://docs.github.com/en/actions/security-for-github-actions/security-hardening-your-deployments/about-security-hardening-with-openid-connect 参照):

| trigger                   | sub 例                                        |
| ------------------------- | --------------------------------------------- |
| tag push (本 release.yml) | `repo:emanon-i/arcagate:ref:refs/tags/v0.2.0` |
| branch push               | `repo:emanon-i/arcagate:ref:refs/heads/main`  |
| pull request              | `repo:emanon-i/arcagate:pull_request`         |

ただし cosign が cert の SAN (Subject Alternative Name) に埋め込み、verify が照合するのは **`job_workflow_ref` claim を URL 化した形式**:

```
https://github.com/emanon-i/arcagate/.github/workflows/release.yml@refs/tags/v0.2.0
```

→ `--certificate-identity` / `--certificate-identity-regexp` で照合する。

## 5. 検証が「保証する」 / 「保証しない」 こと

### 保証する

- artifact bytes が **本 repo の `release.yml` workflow** から生成された (workflow file path + ref)
- 改竄無し (Rekor transparency log に記録された cert 有効期間内の inclusion proof)
- repo owner / collaborator が release tag を push した

### 保証しない

- artifact のソース code 自体が安全 (= 別途 SAST / code review / lessons.md 参照)
- repo の owner / collaborator が信頼できる人物である (社会的信頼は別問題)
- Tauri updater 経路の完全性 (= Tier 1 minisign が必要、本 Tier 2 は配布元証明のみ)

## 6. fork / 改造版での影響

- fork repo の `release.yml` から sign された artifact は `--certificate-identity-regexp` の owner 部分が一致しないので **本 verify command で fail** する
- fork PR は `id-token: write` permission 取得不能 (GitHub OIDC 仕様)、cosign sign-blob は OIDC token 取得失敗で fail → fork から本 repo の identity を冒称した bundle は作れない

参照: https://docs.github.com/en/actions/security-for-github-actions/security-hardening-your-deployments/about-security-hardening-with-openid-connect

## 7. 鍵漏洩 / rotation

cosign keyless は **長期鍵を持たない** (ephemeral cert + Rekor inclusion proof で永続検証成立)。
GitHub repo の `id-token: write` permission を持つ collaborator が compromise されたら新規 sign は防げないが、既存 release の検証履歴は Rekor で audit 可能。`release.yml` workflow に承認フロー (environment protection rules) を入れることで sign 権限を絞れる (R11+ 候補)。

## 8. 出典

- Sigstore cosign signing overview: https://docs.sigstore.dev/cosign/signing/overview/
- Signing blobs: https://docs.sigstore.dev/cosign/signing/signing_with_blobs/
- Verifying signatures: https://docs.sigstore.dev/cosign/verifying/verify/
- sigstore/cosign-installer: https://github.com/sigstore/cosign-installer (v4.1.1 で本 release.yml 採用)
- GitHub Actions OIDC: https://docs.github.com/en/actions/security-for-github-actions/security-hardening-your-deployments/about-security-hardening-with-openid-connect

調査結果: cosign v2+ で `COSIGN_EXPERIMENTAL=1` は不要 (keyless が default)、`--bundle` 単一 JSON が推奨保存形式。
