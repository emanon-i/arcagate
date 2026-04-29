# Dispatch Operation

ディスパッチ運用の **判断ルール** だけを集約。コマンド例 / フローチャート列挙 等の事実は除去（git log / gh pr / lefthook で自明）。詳細歴史は `docs/archive/dispatch-operation-historical.md`。

---

## <severity>critical</severity> §11 user-redo depth-first（現運用、最優先）

batch-109 全体劣化を受けて 2026-04-28 制定。並行 5 plan モードを **撤回**。

### 1 issue の depth-first サイクル

1. **fact 確認**: コードの実態 / 再現手順 / screenshot / **root cause** まで特定（推測で plan 書かない）
2. **guideline 引用**: `memory/design_guidelines_index.md` から該当 doc を引いて該当 section を Read
3. **plan 文書化**: A 案 / B 案比較、引用元 doc + section、横展開対象、影響範囲
4. **横展開 audit**: 同パターンが他に無いか grep / audit script で機械検証
5. **実装 + 検証**: 1 PR で plan + fix + 横展開 fix + screenshot 検証 + （可能なら）audit script 追加
6. **push**: user dev session で目視確認 → 「治った / まだダメ」反応待ち（agent は idle で OK）

### Rule 1: 1 issue ずつ depth-first

並行 plan / 並行 PR **禁止**。1 PR が main 入って user 検収 OK まで次の PR 開かない。
複数 session 並走時は dispatch-queue.md で当番を明記、他は別 batch / 待機。

### Rule 2: 「治った」の定義

❌ pnpm verify pass = 治った
❌ E2E pass = 治った
❌ DOM 存在確認 = 治った
✅ user の dev session 目視で「治った」と言う = 治った

agent の screenshot 自己評価は補助。**最終 OK は user dev 検収**。

### Rule 3: スピードより確実性

batch / Plan の在庫切れで止まるな。1 issue 平均 30 分〜数時間想定、速度を目的化しない。

### Rule 4: Plan 文書化のフォーマット

```markdown
## 引用元 guideline doc

| Doc | Section | 採用判断への寄与 |
| --- | ------- | ---------------- |

## guideline と plan の整合 / 不整合 audit

- ✅ 整合 / ⚠ 注意 / ❌ 不整合（doc 更新必須）

## 横展開チェック

同パターンを {grep / audit script} で確認した結果。
```

doc citation の無い plan は **不完全とみなす**。

---

## <severity>critical</severity> 暴走ブレーキ（即停止）

以下に該当したらその場で停止し作業ログに停止理由を明記:

1. `pnpm verify` 2 回連続失敗 + 原因不明
2. 同箇所を 3 回修正しても受け入れ条件を満たせない
3. CLAUDE.md の禁止事項に触れる修正を検討し始めた
4. Plan 外のファイルを変更する必要が出てきた
5. git の index 破損 / push 失敗 / 認証エラー等で自力復旧不可
6. CI が 2 回連続失敗
7. 作業開始から連続 4 時間経過

---

## <severity>critical</severity> 安全ルール

### dev / E2E は user 許可制

`pnpm tauri dev` / `pnpm test:e2e` は user が「走らせて OK」と明示した場合のみ。
自動バッチでも適用。drag / D&D / グローバルホットキーを含む E2E は実行前に user に告知 + OK 待ち。

### Playwright 安全解放

```typescript
test.afterEach(async ({ page }) => {
  await page.mouse.up().catch(() => {});
});
```

drag テスト中断で `mouse.down()` が残ると PC 操作が乗っ取られる事故あり（2026-04-22 incident）。

### ハング時 kill 手順

```powershell
Get-Process arcagate -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process msedgewebview2 -ErrorAction SilentlyContinue | Where-Object { $_.StartTime -gt (Get-Date).AddMinutes(-10) } | Stop-Process -Force
Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -match 'playwright|arcagate' } | Stop-Process -Force
```

---

## <severity>high</severity> ブランチ / commit / PR 規約

### ブランチ

- 起点: `main`（develop は廃止済）
- 命名: `feature/issue-XXX-<slug>` / `fix/issue-XXX-<slug>` / `chore/<slug>` / `spike/<slug>`
- main: force push / 直 push 禁止。PR 経由 squash merge のみ

### コミットメッセージ

```
<type>(issue-NNN): <ja 要約>
```

type: `feat` / `fix` / `refactor` / `docs` / `test` / `chore` / `perf` / `style`

### PR auto-merge 運用

```bash
git push -u origin <branch>
gh pr create ...
gh pr merge <#> --auto --squash --delete-branch    # 緑になったら自動 merge
gh pr checks <#>                                    # 1 回確認
```

判定:

- **failed**: 即 fix（auto-kick 待たない、自分で push 直す）
- **pending / success**: 次 issue / user 検収待ちへ

「auto-merge してくれるから放置」は禁止。**1 回 checks 確認後に次へ**。

---

## <severity>high</severity> ドキュメント書き換えの境界

- `status: done` の L1 / L2 doc は書き換え禁止
- 規約系（ux_standards / engineering-principles）は plan 着手前に user 確認が望ましい
- 古い retrospective / 達成済 plan は `docs/l3_phases/archive/` または `docs/archive/`
- dispatch-log は append-only

---

## <severity>medium</severity> session 開始時の手順

1. CLAUDE.md（auto-load） + lessons.md / dispatch-operation.md は **on-demand**
2. `git fetch && git status && git log --oneline -10 origin/main` で最新確認
3. 着手 issue を決める（user fb 起点 / dispatch-queue.md / 自律 audit）
4. 引用元 guideline doc を Read
5. depth-first サイクル（Rule 1）開始
