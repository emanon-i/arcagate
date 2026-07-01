# Workflow rules — agent の進め方

全セッションで無条件にロードされる (paths 無し = 全ファイル対象)。

## 判断の芯

- **daily-use-test**: 全機能を「毎日使えるか」で判断する。微妙なら削る
- **instant-feedback**: 設定変更後 100ms 以内に画面へ視覚反応を返す

## 完了基準

- **dom-not-fixed**: 「DOM が存在する」「`pnpm verify` が pass した」を治った判定にしない。
  自分で screenshot を撮り Read で読み返して画面を確認する。最終判定は user dev 検収
- **agent-self-complete**: user に dev 起動 / dump / 動作確認 / DB 操作を依頼しない。
  agent dev (CDP attach + `WEBVIEW2_USER_DATA_FOLDER` 隔離) と実 data scale の seed で完結する

## 調査・修正の規律

- **lateral-sweep**: 不整合を 1 つ見つけたら同 pattern を grep し全画面 audit する。1 file 直して終わりにしない
- **reproduce-before-asking**: vague な user 表現 (「変な位置」「効かない」「崩れる」) は実コード read + dev で
  再現を先に試す。screenshot 要求は全 hypothesis が fail した時のみ
- **cite-guideline**: plan 文書化では引用元 guideline doc + section を明示する。自分の判断で書いた箇所を明示する
- **label-content**: ラベルには機能 / 状態 / アクションを書く。アイコン名 (「星」「三本線」) を書かない

## 開発ルーチン

- コミット前に `pnpm verify` を全段 pass させる (biome / dprint / clippy / rustfmt / svelte-check / cargo test)
- dev は `pnpm app:dev` (隔離起動・推奨) を使う。identifier を `com.arcagate.desktop.dev` に上書きし本番データと物理分離する
- `pnpm tauri dev` (非隔離) を CDP 併用する時は `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9515` を付け、
  user dev と別 port / 別 worktree / 別 `WEBVIEW2_USER_DATA_FOLDER` で隔離する
- `pnpm test:e2e` は user 許可制。drag / hotkey を含む e2e は実行前に告知して OK を待つ

## branch / commit

- main へ直 push してよい。PR は大きな変更単位で任意 (小粒 PR を量産しない)
- branch prefix は `feat/*` / `fix/*` / `chore/*` / `docs/*`、大規模は `refactor/*` を使う
- **serial-pr**: 複数 PR を同時並行で進めない。1 PR が main に入り user 検収 OK になるまで次を開かない
- `--no-verify` で hook を bypass しない

## agent 運用

- 軽作業 (grep / lint / format / verify / 単純 fix) は Sonnet、設計判断 / 多面的解析は Opus を使う (`/model opusplan` で自動切替)
- 独立 task (screenshot / fact 確認 / grep audit) は Task tool で並列化し context を隔離する
- 軽量 fix の事実確認 / 単純 patch / plan 文書化にも `/run-codex` を使う (`review` / `security` / `refactor` prompt あり)
- 各 fix の before/after を CDP で撮り Read で目視評価する (`dom-not-fixed`)

## 暴走ブレーキ (即停止して停止理由を明記)

- `pnpm verify` / CI が 2 回連続失敗し原因不明
- 同箇所を 3 回直しても受け入れ条件を満たせない
- 禁止事項 (backend / frontend / docs rules) に触れる修正を検討し始めた
- Plan 外の file 変更が必要になった
- git 破損で自力復旧できない
