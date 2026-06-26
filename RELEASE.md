# RELEASE.md — リリース手順 (Claude Code 単独実行可)

Arcagate のリリース手順書。**初回セットアップ（署名鍵・Secrets）は完了済み**なので、以降のリリースは
このファイルだけ見れば Claude Code が単独で完遂できる。秘密に触れる作業は無い（鍵は GitHub Secrets 済）。

- 配布: GitHub Releases + Tauri updater (アプリ内自動アップデート)
- 署名 env: `TAURI_SIGNING_PRIVATE_KEY` / `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`（Secrets 登録済）
- 公開鍵: `src-tauri/tauri.conf.json` の `plugins.updater.pubkey`（反映済）
- ロールバック / 緊急対応: [`docs/l1_requirements/operations.md`](docs/l1_requirements/operations.md) Part 2
- 鍵まわりの背景・鍵ローテーション: 同 operations.md §0〜§12

---

## 0. TL;DR（定常リリース）

```bash
# 1. version を 3 ファイルで揃える (例: 0.2.0) + CHANGELOG 更新
#    package.json / src-tauri/tauri.conf.json / src-tauri/Cargo.toml
# 2. commit → main へ push
git add -A && git commit -m "chore(release): v0.2.0" && git push origin main
# 3. タグを打って push (Release workflow 発火)
git tag -a v0.2.0 -m "Arcagate v0.2.0" && git push origin v0.2.0
# 4. workflow 完了を待つ → draft Release が生成される
gh run watch "$(gh run list --workflow=release.yml --limit 1 --json databaseId --jq '.[0].databaseId')"
# 5. 検証 (assets + latest.json の signature が非空)
gh release view v0.2.0 --json assets --jq '.assets[].name'
# 6. 問題なければ公開
gh release edit v0.2.0 --draft=false --latest
```

詳細・検証の中身は以下。

---

## 1. tier（Assets の厚み）

Release workflow が tag / 指定から自動で決める。**通常は lean、節目は full**。

| tier             | 対象                                      | 同梱 Assets                                      |
| ---------------- | ----------------------------------------- | ------------------------------------------------ |
| **lean**（既定） | patch / minor（例 `v0.2.3`）              | `setup.exe` + `latest.json` + `SHA256SUMS.txt`   |
| **full**（節目） | メジャー `vX.0.0`、または手動 `tier=full` | lean + `MSI` + `*.sigstore.json`（cosign）+ SBOM |

- `vX.0.0` のタグは**自動で full**。
- 任意のタグを full にしたい時（初回・LTS 等）は workflow_dispatch で `tier=full` 指定（下記 5.B）。
- **Store 配布に着手する節目**では、`release.yml` の tier step の `BUNDLES="nsis msi"` に `msix` を足し、
  MSIX packaging step を full ブロックに追加する（現状は slot のみ、`TODO MSIX` コメント参照）。

---

## 2. version を上げる（3 ファイル + CHANGELOG）

SemVer。3 ファイルすべて同じ値にする（ズレると updater 判定や表示が壊れる）:

| ファイル                    | 該当                 |
| --------------------------- | -------------------- |
| `package.json`              | `"version": "X.Y.Z"` |
| `src-tauri/tauri.conf.json` | `"version": "X.Y.Z"` |
| `src-tauri/Cargo.toml`      | `version = "X.Y.Z"`  |

`CHANGELOG.md`: `## [Unreleased]` の内容を `## [X.Y.Z] - YYYY-MM-DD` に確定し、新しい空の `[Unreleased]` を作る。

---

## 3. commit & tag

```bash
git add -A
git commit -m "chore(release): vX.Y.Z"
git push origin main           # pre-push hook が full verify を回す (数分)。timeout は長めに設定
git tag -a vX.Y.Z -m "Arcagate vX.Y.Z"
git push origin vX.Y.Z         # → Release workflow 発火
```

> tag は version bump を含む commit を指すこと。pubkey / `createUpdaterArtifacts` が無い古い commit を指すと
> updater 署名検証が壊れる（現行 main には両方反映済なので通常は問題ない）。

---

## 4. workflow を待つ

```bash
RUN=$(gh run list --workflow=release.yml --limit 1 --json databaseId --jq '.[0].databaseId')
gh run watch "$RUN"            # 完了までライブ表示 (build ~15分)
```

完了すると **draft Release** が自動生成される（`github-actions[bot]` 作成、`draft: true`）。

---

## 5. 検証（公開前・必須）

`dom-not-fixed` 同様、「draft できた = OK」にしない。中身を確認する。

```bash
gh release view vX.Y.Z --json assets --jq '.assets[].name'
```

確認ポイント:

- `Arcagate_X.Y.Z_x64-setup.exe` がある（必須）
- `latest.json` がある（自動更新の心臓）
- **`latest.json` の `signature` が非空**（最重要 / `createUpdaterArtifacts` が効いた証拠）:

```bash
gh release download vX.Y.Z --pattern latest.json --dir "$TMP" --clobber
cat "$TMP/latest.json"   # platforms.windows-x86_64.signature が長い base64 なら OK / 空なら異常
```

- full tier なら `MSI` / `*.sigstore.json` / `sbom-*.json` も揃っているか

`signature` が空なら公開しない。`tauri.conf.json` の `createUpdaterArtifacts: true` と Secrets を疑う。

---

## 5.B 手動リリース / tier 指定（任意）

タグ push の代わりに workflow_dispatch でも起動できる。**lean なタグを full にしたい時**に使う:

```bash
gh workflow run release.yml -f tag=vX.Y.Z -f tier=full
```

`tier` 既定は `auto`（= `vX.0.0` のみ full、他は lean）。`lean` / `full` で明示上書き。

---

## 6. 公開（Publish）

```bash
gh release edit vX.Y.Z --draft=false --latest
```

`--latest` で「最新」扱いになり、updater endpoint
`https://github.com/emanon-i/arcagate/releases/latest/download/latest.json` が解決して
既存ユーザーの自動アップデートが回り始める。

ブラウザで最終確認したい場合: `gh release view vX.Y.Z --web`

---

## 7. 困ったら

| 状況                            | 対応                                                                                                                                       |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| build が署名で失敗              | Secrets（`TAURI_SIGNING_PRIVATE_KEY` / `..._PASSWORD`）を `gh secret list` で確認                                                          |
| `latest.json` の signature が空 | `tauri.conf.json` の `createUpdaterArtifacts: true` を確認 → 直して再ビルド                                                                |
| バグ版を公開してしまった        | [operations.md](docs/l1_requirements/operations.md) Part 2「Rollback 手順」（`gh release edit --draft` で降格 → 前版を `--latest` 再昇格） |
| 鍵を紛失 / ローテーション       | operations.md §10（minisign に失効機構なし。手動 reinstall 案内が必要）                                                                    |

---

## 付録: 初回セットアップ（完了済み・再掲）

新しい鍵で 0 から立ち上げる場合のみ必要（通常は不要）。詳細は operations.md §0:

1. `pnpm tauri signer generate -w "$HOME/.tauri/arcagate-updater.key"`（秘密鍵 + passphrase、**人間のみ**）
2. 鍵 + passphrase を PC 外に 1 つバックアップ（災害復旧。失うと auto-update を配れない）
3. `Get-Content -Raw <key> | gh secret set TAURI_SIGNING_PRIVATE_KEY` ＋ passphrase を `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` に
4. `*.key.pub` の中身を `tauri.conf.json` の `plugins.updater.pubkey` に反映
5. `bundle.createUpdaterArtifacts: true` を確認（無いと `.sig` が出ない）
