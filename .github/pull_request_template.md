## Summary

<!-- 1-3 bullet で本 PR の目的 -->

## Test plan

<!-- 検証 checklist -->

---

### 個人データの sanitize check

PR description / commit body / 追加 file に以下を **含めない** (generic 化推奨):

| 漏れがちな表現                          | generic 置換例                           |
| --------------------------------------- | ---------------------------------------- |
| `C:\Users\<name>\...` 個人 path         | `$USERPROFILE\...` / `%USERPROFILE%\...` |
| `E:\Cella\Projects\...` 個人 drive      | `<repo-root>` / `./` 相対                |
| `D:\secrets\...` 個人鍵保管 path        | 「個人 PC の cloud 同期外フォルダ」      |
| 実 item 名 / brand 名 / 作品名          | 「fixture item」 「test target」         |
| `2TB SMR HDD` 等の実機ハード仕様        | 「低速 disk」 「SMR 系 HDD 環境」        |
| 個人 email / SNS handle                 | 削除 or `<user>@example.com`             |
| 「user 実 DB の N 件」 「実 game N 本」 | 「N+ item」 「benchmark fixture」        |

新規追加 line の構造的 leak (個人 path / drive layout / 個人 email) は
`scripts/audit-personal-data.sh` (lefthook pre-commit) で fail-closed 検出される。
brand 名 / 実 item 名 等の user 個別 pattern は手元の
`scripts/.personal-data-patterns.local.txt` (gitignored) に追加して同 hook で守る。

既存 leak の一覧と修正方針: `docs/l3_phases/audit/PERSONAL_DATA_LEAK_AUDIT_2026-05-20.md`
