# Workflow Rules — agent の進め方

Claude は走り出すと突き進む。ここは明示的なブレーキと、この repo 固有の作業規律を書く。

## 判断の芯 (これが最優先)

- **daily-use-test**: 「毎日使えるか？」で全機能を判断。微妙なら削る。配布水準を常に狙う
- **instant-feedback**: 設定を変えたら即見た目が変わる。遅延反映は欠陥。操作 → 視覚反応は 100ms 以内

## 完了基準 (自己申告完了の禁止)

- **dom-not-fixed**: 「DOM 存在 = 治った」「pnpm verify pass = 治った」と判定しない。
  自分で screenshot を撮り Read で読み返して画面で確認する。最終判定は user dev 検収
- **agent-self-complete**: user に dev 起動 / dump / 動作確認 / DB 操作を依頼しない。
  agent dev (CDP attach + `WEBVIEW2_USER_DATA_FOLDER` で隔離) と実 data scale の seed で完結する

## 調査・修正の規律

- **lateral-sweep**: 不整合を 1 つ見つけたら横展開で全画面 audit。1 file 直して終わりにせず、
  同 pattern が他に無いか必ず grep
- **reproduce-before-asking**: vague な user 表現 (「変な位置」「効かない」「崩れる」) は
  実コード read + dev で再現を先に試す。screenshot 要求は全 hypothesis が fail した時の last resort
- **cite-guideline**: plan 文書化では引用元 guideline doc + section を明示する。
  自分の判断で書いた箇所は明示マークする
- **label-content**: ラベルは機能 / 状態 / アクションを書く。アイコン名 (「星」「三本線」) 禁止

## 開発ルーチン

- `pnpm verify` — biome / dprint / clippy / rustfmt / svelte-check / cargo test (全段 pass が前提)
- `pnpm app:dev` — **隔離 dev 起動 (推奨)**。identifier を `com.arcagate.desktop.dev` に上書きし、
  データ保存先を本番 (`%APPDATA%\com.arcagate.desktop\`) と物理分離する。
  インストール版を daily-use しながら dev しても本番データに触れない
- `pnpm tauri dev` — 非隔離起動 (本番 identity = 本番データを使う)。CDP 併用時は
  `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9515` を付け、user dev と別 port /
  別 worktree / 別 `WEBVIEW2_USER_DATA_FOLDER` で隔離する
- `pnpm test:e2e` — Playwright E2E (**user 許可制**。drag / hotkey を含む e2e は実行前に告知 + OK 待ち)
- lefthook = staged file scope。真の品質ゲートは CI

## branch / commit

- main 直 push OK。PR は大きな変更単位で任意 (小粒 PR を量産しない)
- prefix: `feat/*` / `fix/*` / `chore/*` / `docs/*`、大規模は `refactor/*`
- test gate (svelte-check / clippy / cargo test / build) は全 branch 同一
- **serial 規律**: 複数 PR を同時並行で進めない。1 PR が main 入って user 検収 OK まで次を開かない

## agent 運用

- **モデル使い分け**: 軽作業 (grep / lint / format / verify / 単純 fix) = Sonnet、
  設計判断 / 多面的解析 = Opus。`/model opusplan` で自動切替
- **sub-agent 並列**: 独立 task (screenshot / fact 確認 / grep audit) は Task tool で分離し context 隔離
- **Codex 二次活用**: review だけでなく軽量 fix の事実確認 / 単純 patch / plan 文書化にも
  `/run-codex` を使う。`review` / `security` / `refactor` の専用 prompt あり
  (skill: `$USERPROFILE\.claude\skills\run-codex\SKILL.md`)
- **screenshot 自己評価**: CDP で各 fix の before/after を取得し Read で目視評価。
  DOM 存在だけで判定しない (`dom-not-fixed`)

## 暴走ブレーキ (即停止して停止理由を明記)

`pnpm verify` / CI が 2 回連続失敗 + 原因不明 / 同箇所を 3 回直しても受け入れ条件を満たせない /
禁止事項に触れる修正を検討し始めた / Plan 外の file 変更が必要になった / git 破損で自力復旧不可。
