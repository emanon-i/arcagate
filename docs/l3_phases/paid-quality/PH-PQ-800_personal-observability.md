---
id: PH-PQ-800
status: planning
batch: paid-quality
type: 新機能
era: Post-v1 (v2)
parent: README.md
---

# PH-PQ-800: パーソナル observability — 活動追跡 + システム履歴 × アイテムモデル相互強化

> **これは v1 GitHub リリース後の v2 機能。 今すぐ着手しない。**
> 着手条件は **PH-PQ-700 完了 + GitHub への v1 リリース完了** の両方。 本 doc は v2 構想を
> L3 として記録するための plan であり、 v1 paid-quality sweep (PQ-100〜700) の scope には
> 含めない。 着手時点で本 doc を起点に L3 を再 review し、 当時の競合状況・技術状況に
> 合わせて更新してから実装に入ること。

## 問題

Arcagate は「PC 上に散在する起動元を 1 箇所に集約するランチャー」 として v1 を出す。 だが
launcher は「**起動の瞬間**」 しか観測していない。 user が 1 日のうち実際に何のアプリを
どれだけ使い、 何を聴き、 どの作業にどれだけマシンリソースを使ったか — その「**起動後の
時間**」 は完全に blind spot になっている。

一方、 既存の活動追跡ツール (ActivityWatch が代表) は「正しいことをやっているのに使い
づらい」 という共通の弱点を抱える:

- ダッシュボードが開発者向けで読みにくい (生ログの羅列、 美しくない)
- **手動カテゴリ分けが苦痛**: 「このアプリは仕事」 「これは娯楽」 を user が延々と分類する
- 個人スケールに対して設計が重い (sync server / web UI 前提)

Arcagate には、 この弱点を構造的に潰せる固有の武器がある — **同一アイテムモデル
(exe / url / folder / script / command) と、 item に付いた tag**。 追跡したアプリを登録 item と
照合できれば、 「手動カテゴリ分け」 という ActivityWatch 最大の苦痛が **item の tag で自動的に
解決**する。 これは ActivityWatch にも Rainmeter にもできない、 Arcagate だからできる統合。

### コンセプト

**「ActivityWatch の見やすい版 + 個人スケールの軽量 observability」**。 さらに踏み込んで、
**Arcagate の item model と相互強化する**点が core 差別化。 「追跡する」 だけのツールは既に
ある。 Arcagate の追跡は「**追跡結果が Library を育て、 育った Library が追跡精度を上げる**」
という compounding loop を回す。

そして本 phase の **北極星は「見やすさ」** — 追跡項目の数ではなく、 可視化の質で勝つ
(§ガイド原則)。

## ガイド原則 — この phase の北極星は「見やすさ」

**動機**: user は ActivityWatch を実際に使っていたが、 「**見づらい**」 ことが最大の不満
だった。 ActivityWatch は **データは持っているのに読めない** — これが弱点。 PH-PQ-800 は
その弱点を突く phase。

**価値の所在**: PH-PQ-800 の価値は「**追跡項目の数**」 ではない。「**可視化の質**」 — 一目で
分かる / 見て気持ちいい / 毎日見たくなる、 にある。 差別化は機能ではなく **UX**。 追跡項目を
いくら増やしても、 ダッシュボードが読めなければ ActivityWatch と同じ轍を踏む。

→ 全タスクの判断基準: 「この追加で、 user の『今日どこに時間が行ったか』 が **より速く・
より気持ちよく**分かるか?」。 分からないなら、 その追跡項目は core ではなく候補に落とす。

### 成功基準 (測定可能な形に落とす)

「項目 X を追跡できた」 という機能チェックではなく、 **見やすさ**を測れる形にする:

- **到達速度**: Activity Insight 画面を開いて「今日どこに時間が行ったか」 の主要インサイトに
  **3 秒以内**で到達できる (主役の情報が画面上部、 スクロール不要)
- **fresh-eye『読める』判定**: 画面を初見の目でレビューし、 説明なしで「何の画面か / 何が
  分かるか」 が伝わる (CLAUDE.md `<critical-rule id="dom-not-fixed">` の実機目視で判定)
- **craft 基準準拠**: PQ-300 の craft sweep 基準 (EmptyState / LoadingState / ErrorState /
  余白 / animation / WCAG 2.2 AA) を Activity Insight 画面で満たす
- **ActivityWatch 比で見やすい**: 同じ 1 日分のデータを ActivityWatch と Activity Insight に
  並べ、 「どこに時間が行ったか」 を読み取る時間 / 迷いが Arcagate 側で明確に短い
- **毎日見たくなるか**: `daily-use-test` (CLAUDE.md 最上位 rule)。 「毎日 1 回 開きたい」 と
  思える画面か — 微妙なら可視化設計を見直す

## スコープ

本 phase は大きく 4 つの観測領域 + 1 つの連携機構で構成する。

### スコープ 1. 活動追跡

「いま何をしているか」 を低コストで定期サンプリングする:

- **アクティブウィンドウ**: 前面プロセス名 + ウィンドウタイトル + 滞在時間 + idle / AFK 検出。
  AFK は Win32 `GetLastInputInfo` (最終入力からの経過時間) で判定し、 一定時間 入力なしを
  AFK としてカウントから除外する (§技術的論点)
- **再生中メディア**: 曲 / 動画。 Windows SMTC (System Media Transport Controls) API 経由で、
  Spotify / YouTube Music / ブラウザ / ローカルプレイヤーを **横断**して「いま鳴っている曲」 を取得
- **ブラウザのアクティブタブ**: ページ名 + **ドメイン粒度** (URL 全体ではなくドメインまで)。
  対応は主要ブラウザ (Chrome / Edge / Firefox) に限定 + Chromium 系 (Brave / Vivaldi /
  Opera) を低コストで併せて対応。 技術的 caveat は後述 (§技術的論点)

### スコープ 2. システムメトリクス履歴

既存の SystemMonitor widget (`src/lib/widgets/system-monitor/`) は **現在値のスナップショット**
しか持たない。 これを **時系列記録**へ拡張する:

- CPU / RAM / disk 使用率 / network throughput を timestamp 付きで蓄積
- 「過去 1 週間の CPU 推移」 のような履歴グラフを可能にする
- 既存 widget の sparkline buffer (`src/lib/utils/history-buffer.ts`) は in-memory・揮発。
  これを永続時系列に置き換える

### スコープ 3. プロセス別リソース消費 × アクティブアプリ相関

「マシンが重い時、 何が食っているか」 を可視化する:

- **第 1 段**: アプリ別 CPU / RAM 消費。 Windows のプロセス性能カウンタ
  (Performance Counters / `GetProcessTimes` 等) から取得
- **stretch goal (難易度高、 別途明記)**: GPU のプロセス別使用率 / 発熱 (温度センサ) / 電力。
  これらは取得 API が安定せず、 ハードウェア依存・ベンダ依存が大きい。 本 phase の必達には
  含めず、 「取れたら入れる」 の stretch 扱い
- 活動カテゴリ別のリソースコスト分析 (例: 「ゲームに使った CPU 時間」 「開発に使った RAM」)

### スコープ 4. item model 連携 (本機能の核心)

追跡データと Library を結ぶ 3 つの相互強化。 §「item model 連携」 で詳述。

## 観測シグナル — core と候補の切り分け

本 phase が観測するシグナルを **core (v2 で確実に実装)** と **候補 (v2 着手時に採否判断)** に
分ける。 候補は「あったら有用」 だが、 core の完成を待たずに肥大化させないための切り分け。
本 doc は候補を **記録**するためのものであり、 候補すべての実装を約束しない。

### core シグナル (v2 で確実に実装)

| シグナル             | 取得方式                                                    |
| -------------------- | ----------------------------------------------------------- |
| AFK / idle           | Win32 `GetLastInputInfo` (最終入力からの経過時間)           |
| アクティブウィンドウ | Win32 `GetForegroundWindow` + プロセス名 + 実行イメージパス |
| ブラウザ URL         | UIA でアクティブタブのアドレスバー (主要 3 + Chromium 系)   |
| 再生メディア         | Windows SMTC (全プレイヤー横断)                             |
| システムメトリクス   | CPU / RAM / disk / network の時系列                         |

### 候補シグナル (v2 着手時に採否判断、 core ではない)

core を肥大させずに、 着手時点で「本当に要るか」 を判断するための候補リスト:

| 候補シグナル              | 何が分かるか                             | 取得方式 / 備考                                            |
| ------------------------- | ---------------------------------------- | ---------------------------------------------------------- |
| ロック / セッションロック | 確実な離席シグナル                       | Win32 セッション通知 (`WTSRegisterSessionNotification` 等) |
| 全画面状態                | ゲーム / 動画 / プレゼンの文脈           | アクティブアプリが fullscreen か否か                       |
| マイク / カメラ使用中     | 「通話中」 検出 → ミーティング時間が出る | **使用中の boolean のみ** (§プライバシー)                  |
| 電源状態                  | バッテリー / 給電                        | Win32 電源 API                                             |
| 入力強度                  | エンゲージメント強度 (二値 AFK より濃淡) | 打鍵数 / マウス移動距離の **カウントのみ** (§プライバシー) |

候補の採否は v2 着手時に「core が完成し、 これを足す価値があるか」 で判断する。 採用する
場合も §プライバシーの厳密条件 (入力強度はカウントのみ / マイク・カメラは boolean のみ) を
守る。

## item model 連携 (この機能の核心)

単なる活動追跡ではなく、 **Arcagate の item model と双方向に強化し合う**のが本 phase の存在
理由。 3 つの相互強化:

### 連携 1. 真の利用頻度

現状の Arcagate は「**Arcagate から起動した回数**」 (`launch` table) しか知らない。 だが user は
登録済アプリを Start メニューや既存ショートカットからも起動する。 活動追跡がアプリ前面化を
検出すれば、 **Arcagate 外から起動された登録 item も使用としてカウント**できる:

- 「Arcagate 経由の起動回数」 ではなく「**実利用頻度**」 が分かる
- これは **Library 整理に直結**する: 「登録したが実際には全く使っていない item」 を検出でき、
  未使用 item の整理・アーカイブ提案ができる

### 連携 2. 未登録アプリのレコメンド

活動追跡は登録 item 以外のアプリも観測している。 「**毎日 1 時間使っているのに Library に
無いアプリ**」 を検出したら、 item として登録することを提案する:

- user が手で登録しなくても、 **Library が実利用に追従して自動的に育つ**
- 「よく使うものが Library に揃っている」 状態が、 user の作業なしで維持される

### 連携 3. tag で自動カテゴリ分類

**ActivityWatch 最大の苦痛 = 手動カテゴリ分け**。 Arcagate ではこれが構造的に消える:

- 追跡したアプリ/ウィンドウが登録 item と match すれば、 **その item に付いた tag が
  そのままカテゴリになる**
- user は item に一度 tag を付けるだけ (それも Library 運用で元々やっていること)。
  活動追跡のための追加分類作業は **ゼロ**
- 例: `vscode.exe` に `仕事` `開発` tag → 追跡上の VS Code 使用時間が自動的に
  「仕事 / 開発」 カテゴリに集計される

### compounding loop

この 3 連携は独立した機能ではなく、 **ループ構造**を成す:

```
活動追跡 → 未登録アプリ検出 → 登録レコメンド → item 登録 + tag 付与
   ↑                                                    │
   │                                                    ▼
インサイト精度向上 ← カテゴリ分類精度向上 ← match 対象が増える
```

追跡するほどレコメンドが出て、 登録するほど match 率が上がり、 match するほど
カテゴリ分類が正確になり、 インサイトが鋭くなる。 **使うほど価値が増す compounding** が、
「ただの追跡ツール」 との決定的な差。

## match key 戦略

連携の前提は「追跡したプロセス / ウィンドウ」 と「登録 item」 の照合。 item 種別ごとに
照合キーを定める (`ItemType` enum: `Exe` / `Url` / `Folder` / `Script` / `Command`,
`src-tauri/src/models/item.rs:5-11`):

| item 種別 | 照合キー         | 照合相手                                        |
| --------- | ---------------- | ----------------------------------------------- |
| `Exe`     | 実行ファイルパス | 追跡プロセスの実行イメージパス (正規化して比較) |
| `Url`     | **ドメイン**     | ブラウザアクティブタブのドメイン                |
| `Folder`  | パス             | 前面ウィンドウの対象パス (Explorer 等)          |
| `Script`  | パス             | 実行スクリプトのパス                            |
| `Command` | (照合困難)       | コマンド実行は前面プロセスとして観測しにくい    |

- パス比較は大文字小文字 / 環境変数展開 / シンボリックリンクの正規化を経てから行う
- 1 プロセスが複数 item に match する場合の優先順位 (より具体的なパス優先) を定義する
- `Command` 種別は前面プロセスとして安定観測しにくいため、 第 1 段では match 対象外で良い
- 照合は「当たった / 外れた」 の二値で終わらせない。 一致方法によって確信度が変わる
  (`Exe` パス完全一致 = 高、 ウィンドウタイトルからの推測 = 低)。 各 match には確信度
  `confidence` と一致理由 `match_reason` を持たせて保存する (詳細は §T5)

## 技術的論点 (正直に書く)

楽観で書かず、 既知の難所を先に明示する。

### ブラウザタブの取得方式 (user 確定済)

OS の前面ウィンドウ API から確実に取れるのは **ウィンドウタイトルだけ**。 URL / ドメインは
取れない。 拡張機能なしで URL を取る現実的手段は **UI Automation (UIA) でブラウザの
アドレスバー要素のテキストを読む**こと。

**user 確定方針 (v2 core)**: 「**アクティブタブの URL が取れれば十分**」。 バックグラウンド
タブまでは追わない。 → **UIA でアクティブタブのアドレスバーを読む方式を採用し、 ブラウザ
拡張は v2 core では作らない**。

この方式の caveat は引き続き明記する (実装時に織り込む):

- **アクティブタブ限定** — バックグラウンドタブは読めない (user 判断で許容)
- **ブラウザ更新で壊れ得る** — アドレスバーの UIA tree はブラウザのバージョンアップで変わる。
  Chrome / Edge / Firefox で別実装 (per-browser adapter) が要る
- アドレスバーが編集中 / 一部省略表示の時に不正確 → 取れない時は
  「ブラウザ (ドメイン不明)」 にフォールバック

**対応ブラウザ範囲 (user 確定)**: URL だけ取れれば十分なので、 対応は **主要ブラウザ
(Chrome / Edge / Firefox)** に限定する。 Brave / Vivaldi / Opera は Chromium 系で Chrome と
ほぼ同じ UIA 構造のため、 Chrome adapter をほぼ流用して **低コストで併せて対応**できる。
全ブラウザの網羅は狙わない (マイナーブラウザは対象外で割り切る)。

**将来の検討余地 (v2 core 外)**: 「全タブ追跡が欲しい人向け」 の optional なブラウザ拡張を、
将来 別 phase で検討する余地は残す。 ただし v2 core は **拡張ゼロで完結**させる。 ActivityWatch
がプラグイン (aw-watcher-web 拡張) を必須にしたのは「全タブ・全ブラウザ確実」 を目指した
ため。 Arcagate は「アクティブタブで十分」 と割り切ることで、 core では拡張を不要にする。

### UI Automation の活用範囲 (スコープ規律)

UIA はブラウザ URL 以外にも多くの情報を読める。 **有用な追加候補**:

- **エディタ / Office の編集中ドキュメント名** — VS Code / Word / Excel 等が「いま開いて
  いるファイル」 を UIA から取得できれば、 「特定ドキュメントに 2 時間」 のような粒度が
  得られる (ウィンドウタイトルでも近いものは取れるが、 UIA の方が安定するアプリがある)

ただし **スコープ規律を厳守**する:

- UIA の要素 tree は **アプリごとにバラバラ・脆い**。 アプリ更新で壊れ、 per-app adapter が要る
- UIA で深く読むと **プライバシーの地雷** — 編集中テキストの中身、 メール本文、 chat 内容
  まで読めてしまう
- → 取得対象は **「ブラウザ URL + 既知アプリのドキュメント名」 程度の、 小さく明示的に
  定義された集合に限定**する。 「UIA で何でもスクレイプする」 は **やらない**
- 新しい UIA 取得対象を増やす時は、 必ず本 doc の「定義された集合」 を更新してから
  にする (暗黙拡大の禁止)

### AFK 検出の方式 (user 確定済)

AFK (離席) 判定は、 マウス移動量を自前で積分計測するのではなく、 Win32 `GetLastInputInfo`
で **最後のマウス / キーボード入力からの経過時間を直接取得**する方式を採用する。 一定時間
入力がなければ AFK とみなし、 その間をアクティブ時間カウントから除外する。 これは
ActivityWatch の AFK watcher と同方式。 OS 標準 API のみでシンプル、 recorder 軽量化方針とも
整合する。 この方式を core とする。

### 取得品質の可視化 (静かな劣化をさせない)

UIA (ブラウザ URL) も SMTC (メディア) も取得は失敗し得る — ブラウザのバージョンアップ、
権限不足、 非対応プレイヤー。 失敗を「ブラウザ (ドメイン不明)」 と黙って記録して終わると、
user は「なぜインサイトが薄いのか」 が分からず、 不信感だけが残る。

→ 取得の成否を recorder が集計し、 Activity Insight 画面に **データ品質メーター**
(`High` / `Partial`) として常設表示する。 `Partial` の時はその理由 (例: 「ブラウザ URL
取得失敗率 40%」) と **修正アクション** (再権限確認 / 除外設定の見直し) を併せて開示する。
「静かな劣化」 を、 user が原因を理解して直せる状態に変えるのが狙い (T1 / T2 で失敗率を
記録し、 T6 で表示する)。

### 時系列の retention / downsampling 必須

活動追跡 + システムメトリクスは高頻度サンプリング。 naive に「INSERT し続けるだけ」 では
**SQLite DB が際限なく膨張して破綻**する。 設計時から retention を組み込む:

- timestamp インデックス専用の時系列テーブル (既存 item / workspace テーブルとは分離)
- **定期集約 (downsampling)**: 生データ 1 日保持 → 1 分平均 1 週間保持 → 1 時間平均 1 年保持
- 集約済みより古い生データの **pruning** (削除)
- 集約 / pruning は recorder とは別の定期ジョブで実行

### recorder は軽量に

- **interval poll 型**。 イベント駆動ではなく低頻度ポーリング (例: 数秒〜十数秒間隔)
- 既存のフォルダ watcher (`src-tauri/src/watcher/`) の **兄弟**だが、 watcher が
  notify ベースのイベント駆動なのに対し、 recorder は **定期ポーリング型**
- CPU 負荷を最小に。 「観測しているせいで重くなる」 は本末転倒

### アーキ追加は不要

新パラダイムは要らない。 既存の構造にそのまま乗る:

- **保存**: 既存のローカル SQLite (`Mutex<Connection>` + WAL) に時系列テーブルを追加
- **収集**: 既存 watcher 機構の隣に recorder を 1 つ足す
- **表示**: 既存の画面 / route システムに Activity Insight 画面を 1 つ足し、 既存 widget
  システムに従属サマリ widget を 1 つ足す (§T6)
- レイヤーも既存どおり `commands → services → repositories → DB`

## プライバシー (必須設計、 後付け禁止)

活動追跡は本質的に sensitive。 プライバシーは **最初から設計に組み込む** — 後付けは禁止:

- **完全ローカル保存**: 追跡データは SQLite に閉じ、 一切外部に送信しない。 telemetry / crash
  報告にも追跡データを混ぜない
- **opt-in**: デフォルト OFF。 もしくは初回に明示的な同意 UI を出してからでないと記録を
  開始しない。 「知らないうちに記録されていた」 を起こさない
- **除外リスト**: 特定アプリ / ドメイン / ウィンドウタイトルパターンを記録対象外にできる
  (例: パスワードマネージャ、 銀行サイト)
- **ウィンドウタイトルのマスク**: タイトルには機微情報 (ファイル名・相手名・URL) が乗りやすい。
  「プロセス名のみ記録、 タイトルは記録しない」 モードを用意する
- **データ削除**: user がいつでも追跡履歴を全削除 / 期間指定削除できる

### 候補シグナル採用時の厳密条件

§観測シグナルの候補シグナルを v2 着手時に採用する場合、 以下を **設計上の絶対条件**とする
(条件を満たせないなら採用しない):

- **入力強度を採用する場合**: 記録するのは **カウント (打鍵回数 / マウス移動距離) のみ**。
  どのキーを押したかの **キー内容は絶対に記録しない** — キー内容を記録した瞬間に
  キーロガーになる。 強度は数値の集計のみ
- **マイク / カメラを採用する場合**: 記録するのは **使用中か否かの boolean のみ**。
  音声・映像の中身、 デバイス名の詳細には一切触れない

## やらないこと (Datadog 沼の回避)

「個人スケールの軽量 observability」 を守る。 エンタープライズ observability の道具立ては
**意図的にやらない** — それをやると「完成ライン」 が永遠に来ない沼にハマる:

- **アラート / 閾値通知** — 「CPU が 90% 超えたら通知」 等はやらない
- **異常検知** — 統計的 anomaly detection はやらない
- **分散トレーシング** — 単一 PC の個人ツールに trace の概念は不要
- **共有ダッシュボード / multi-user** — ローカル単独 user 完結を崩さない
- 第 3 者へのデータエクスポート連携 (Grafana 等への push)

「Datadog レベルの observability」 は個人アプリでは沼。 完成ラインが無く、 maintenance
コストだけが増える。 Arcagate は **「自分の PC の使い方が、 見て分かって面白い」** の一点に
絞る。

## 段階化

### 第 1 段 (本 phase の必達範囲)

- 活動追跡 (core シグナルのみ、 §観測シグナル): アクティブウィンドウ + AFK
  (`GetLastInputInfo`) + 再生メディア (SMTC) + ブラウザ URL (UIA、 主要 3 + Chromium 系)
- アプリ別 CPU / RAM (プロセス性能カウンタ)
- 時系列テーブル + retention / downsampling
- item model 連携 3 種 (真の利用頻度 / 未登録レコメンド / tag 自動カテゴリ)
- Activity Insight 画面 (新トップレベル screen) + 従属サマリ widget + プライバシー設計一式
- **候補シグナル (§観測シグナル) は段階化の外** — v2 着手時に core 完成後 採否判断する

### 第 2 段 (本 phase の後半 or 別 phase)

- SystemMonitor widget の履歴化 (時系列テーブルへの統合)
- **stretch**: GPU プロセス別 / 発熱 / 電力

## 具体タスク

### T1. activity recorder (バックエンド収集機構)

- `src-tauri/src/recorder/` を新設 (watcher の兄弟ディレクトリ)。 interval poll で
  前面ウィンドウ・プロセス・メディア・タブをサンプリング
- アクティブウィンドウ取得: Win32 `GetForegroundWindow` + プロセス名 + 実行イメージパス
- idle / AFK 検出: Win32 `GetLastInputInfo` で最終入力からの経過時間を取得、 一定時間
  入力なしを AFK 判定 (ActivityWatch の AFK watcher と同方式、 §技術的論点)
- メディア取得: Windows SMTC (`GlobalSystemMediaTransportControlsSessionManager`) で
  全プレイヤー横断の再生中トラックを取得。 SMTC 取得層は本 phase 内で実装する
- 取得の成否 (SMTC / 前面ウィンドウ取得の成功率) を recorder が集計し、 データ品質指標に
  渡せるようにする (§技術的論点「取得品質の可視化」、 T6 でメーター表示)
- recorder は opt-in が ON の時のみ起動 (§プライバシー)

### T2. ブラウザアクティブタブ取得 (UIA、 拡張なし)

- **方式は確定** (§技術的論点): UIA でアクティブタブのアドレスバーを読む。 ブラウザ拡張は
  v2 core では作らない
- 対応は主要 3 ブラウザ (Chrome / Edge / Firefox)。 Chromium 系 (Brave / Vivaldi / Opera) は
  Chrome adapter 流用で低コスト併対応。 per-browser adapter 層で UIA tree 差を吸収、
  マイナーブラウザの網羅は狙わない
- 取得失敗時は「ブラウザ (ドメイン不明)」 にフォールバック (例外で recorder を止めない)
- 取得失敗 (ドメイン不明フォールバック) の発生率を recorder が記録し、 データ品質指標へ
  集計する (§技術的論点「取得品質の可視化」)。 失敗率が高い時に T6 で理由と修正アクションを
  user へ開示し、 「静かな劣化」 にしない
- URL からドメインのみを抽出して保存 (フルパス・クエリは保存しない = プライバシー兼)
- **UIA scope 規律** (§UI Automation の活用範囲): 取得対象は「ブラウザ URL + 既知アプリの
  ドキュメント名」 の小集合に限定。 既知アプリのドキュメント名取得 (VS Code / Office 等)
  は有用な追加候補だが、 UIA の汎用スクレイプはしない。 対象を増やす時は本 doc の
  定義集合を更新してから
- 「全タブ追跡向け optional 拡張」 は v2 core 外、 将来別 phase の検討余地として記録

### T3. プロセス別リソース消費

- アプリ別 CPU / RAM をプロセス性能カウンタから取得 (recorder の poll に相乗り)
- アクティブアプリ相関: 「前面だったアプリ」 と「その時間のリソース消費」 を結ぶ集計
- **原因候補ビュー**: 相関は「グラフを 2 つ並べる」 で終わらせず、 「重かった時間帯」 から
  逆引きできる 1 パネルを設計する。 `CPU ピーク時刻 → その時の前面アプリ → 同時刻の上位
  プロセス → 各プロセスの実行時間` を 1 画面にまとめ、 「なぜ重かったか」 の候補を提示
  する。 「見るだけ」 で終わらず「次に何をすればいいか」 (重いプロセスを止める等) まで
  分かる画面にする
- GPU / 発熱 / 電力は **stretch** として別タスク T3-stretch に切り出し、 必達から外す

### T4. 時系列ストレージ + retention + セッション集約

- 時系列専用テーブルを migration で追加 (`include_str!` 埋め込み、 forward-only):
  activity event 用 / system metric 用 / process metric 用
- timestamp index を張る
- **セッション集約レイヤ `sessionized_activity`**: 生イベントの保存に加え、 表示用の
  集約テーブルを 1 つ持つ。 連続する同種イベントを 1 セッションに畳み、 タイムラインを
  生イベントの点列ではなく **連続した帯**で描けるようにする (§T6 タイムライン)。
  1 行 = 1 セッションで以下の列を持つ:

  | 列                 | 内容                                 |
  | ------------------ | ------------------------------------ |
  | `started_at`       | セッション開始時刻                   |
  | `ended_at`         | セッション終了時刻                   |
  | `primary_app`      | セッション中の前面時間が最長のアプリ |
  | `primary_category` | 主カテゴリ (tag 由来、 §連携 3)      |
  | `active_seconds`   | AFK 除外後の実アクティブ秒数         |

  セッション境界は「前面アプリ / カテゴリの切替」 と「AFK 区間」 で切る。 集約は生イベント
  から定期ジョブで生成し、 生イベントから常に再生成できる (集約ロジック変更時に過去分を
  作り直せること)
- downsampling ジョブ: 生 1 日 → 1 分平均 1 週 → 1 時間平均 1 年。 古い生データを prune
- **downsampling は保存効率だけでなく可視化品質も基準にする**。 縮約しても見え方が劣化
  しないことを数値で担保する — 縮約後の **日次合計の誤差 < 2%**、 **カテゴリ比率の誤差
  < 3%**。 集約関数は平均だけに頼らず、 指標ごとに `sum` (合計時間) / `max` (ピーク) /
  `p95` (負荷分布) を使い分ける (平均だけだとピークやカテゴリ比率が潰れる)
- ジョブは recorder とは別の定期タスクで実行
- 既存 `Mutex<Connection>` + WAL に乗せる (Pool 不要、 設計の固定枠どおり)

### T5. item model 連携 (照合 + レコメンド + カテゴリ)

- match engine: 追跡 event を §match key 戦略のキーで登録 item と照合する service
- **match に信頼度を保存**: 各 match 結果に `confidence` (`high` / `medium` / `low`) と
  `match_reason` (`exe_path_exact` / `domain_exact` / `title_heuristic` 等、 どのキーで
  当たったか) を持たせる。 完全一致は `high`、 タイトル推測のような曖昧な照合は `low`。
  これにより誤マッチを「黙って集計に混ぜる」 のではなく **UI から可視化・修正できる** —
  `low` 信頼の活動は Activity 画面で「未分類 / 低信頼」 として表示し、 その場で正しい
  item / tag に直す導線を出す (§T6)
- 真の利用頻度: match した event を item の実利用としてカウント、 既存 `launch` 由来の
  起動回数と区別して保持
- 未登録レコメンド: 高頻度なのに未 match のアプリを抽出。 即時通知ではなく、 Activity
  画面の **週次レビューカード** (§T6) に「今週の候補 3 件」 として渡す。 各候補は
  `利用時間` / `想定 tag` (周辺 match の tag から推定) / `ワンクリック登録` を持つ
- tag 自動カテゴリ: match した item の tag を活動カテゴリとして集計する経路
- レイヤー遵守 (`commands → services → repositories → DB`)、 repository 直呼び禁止

### T6. Activity Insight 画面 (新トップレベル screen) + 従属サマリ widget

タイムライン / 日次・週次内訳 / カテゴリ別チャート / アプリ別リソースグラフ / 相関ビューは
**widget 1 個に収まらない、 画面 1 枚分のボリューム**。 → observability の本体は widget では
なく **画面**として設計する。

**メイン: Activity Insight 画面 (新トップレベル screen)**

- **Library / Workspace と並ぶ 3 つ目の主要画面**として新設。 ナビ (上部タブ領域) に
  `Library / Workspace / Activity` の 3 タブが並ぶ
- アーキ的には **route / screen を 1 つ足すだけ** — 既存の画面システムに乗る、 新パラダイム不要
- 画面 doc を `docs/l2_foundation/screens/activity.md` として新設 (既存 screens/ と同体裁)
- 「ActivityWatch の見やすい版」 — 美しく読めるダッシュボードを最優先 (§ガイド原則の
  成功基準を満たす)

画面は上から下へ **「即答 → 探索 → 行動」** の順で構成する。 §ガイド原則の「3 秒到達」 を
レイアウト構造で担保するため、 この層順は固定する:

**(1) 固定トップサマリ帯** — スクロール不要・画面最上部に固定。 グラフを探索する前に
「今日どこに時間が行ったか」 を 1 行で即答する。 最低限 以下を表示:

| 要素                   | 内容                                     |
| ---------------------- | ---------------------------------------- |
| 今日の総アクティブ時間 | AFK 除外後の合計                         |
| 最大カテゴリ           | tag 由来カテゴリの最長 (例: 「開発 3h」) |
| 最長アプリ             | 前面時間が最長のアプリ                   |
| 昨日比                 | 総アクティブ時間の前日差分 (+/-)         |
| いまの状態             | Active / AFK / Media のいずれか          |

この帯が「主要インサイトに 3 秒以内到達」 (§成功基準) を UI 構造として保証する装置になる。

**(2) タイムライン (セッション帯)** — 生イベントの点列ではなく **セッション帯**で 1 日を
描く (T4 `sessionized_activity`)。 5〜30 分単位の連続帯で、 各帯は主カテゴリ色 + 主アプリ名を
持つ。 点データより帯データの方が 1 日を再構成しやすく、 読み取りが速い。

**(3) 日次 / 週次内訳 + 自動インサイト文** — カテゴリ別 (tag 由来) チャート、 アプリ別
ランキング。 各グラフ脇に **短文インサイトを常設**し、 user がグラフ解釈を自力でしなくて
済むようにする。 比較基準は **「昨日」 と「先週同曜日」 に標準化**する (恣意的な比較期間を
作らない)。 例: 「開発カテゴリが先週同曜日比 +1h20m」。

**(4) 週次レビューカード (未登録アプリ推薦)** — 未登録アプリのレコメンドは即時ポップアップ
ではなく、 画面上部に **「今週の候補 3 件」 カードを常設**する。 各候補に `利用時間` /
`想定 tag` (連携 3 の自動カテゴリ由来) / `ワンクリック登録` を付ける。 邪魔せず毎日 Library
育成を促し、 daily-use を強める (§連携 2)。

**(5) アプリ別リソースグラフ + 原因候補ビュー** — T3 の相関ビュー (重かった時間帯の逆引き、
§T3 原因候補ビュー) を画面内に配置する。

**(6) データ品質インジケータ** — 画面右上に `データ品質: High / Partial` を常設表示する
(§技術的論点「取得品質の可視化」)。 UIA / SMTC の取得失敗で「ドメイン不明」 等が増えた時、
理由 (例: ブラウザ URL 取得失敗率) と修正アクション (再権限確認 / 除外設定確認) を開示する。

**低信頼マッチの修正導線** — `confidence` が `low` の活動 (§T5) は UI 上で「未分類 /
低信頼」 として可視化し、 その場で正しい item / tag に直せるようにする。 誤分類が放置
されず、 compounding loop が速く回る。

**従: Activity サマリ widget (Workspace 配置可、 deep-link)**

- Workspace canvas に置ける「今日の活動サマリ」 的な **compact widget**。 glance 用
- クリックで本体の Activity Insight 画面へ **deep-link**
- フル画面が主、 サマリ widget が従 — widget は画面の縮約ビューであり、 機能の本体ではない
- WidgetType enum にサマリ widget を 1 つ追加 (`src-tauri/src/models/workspace.rs:9-31`、
  `audit-widget-coverage.sh` の Rust enum ↔ TS bindings ↔ i18n 3 点同期を維持)

### T7. SystemMonitor widget の履歴化 (第 2 段)

- 既存 SystemMonitor widget の in-memory sparkline buffer
  (`src/lib/utils/history-buffer.ts`) を T4 の永続時系列に置き換え
- 「過去 1 週間」 等の時間レンジ切替を widget config に追加
- 既存 widget の現在値スナップショット表示は維持しつつ、 履歴グラフへ拡張

### T8. プライバシー設計の実装

- opt-in 同意 UI (初回 ON 時に明示同意)、 デフォルト OFF
- 設定画面: 除外リスト (アプリ / ドメイン / タイトルパターン)、 タイトルマスクモード
- **記録プレビュー**: 設定画面に「今の設定だと何が保存されるか」 をサンプル表示する
  (例: `browser: domain のみ` / `title: masked` / `入力: 記録しない`)。 さらに
  **「今すぐ 30 秒テスト記録 → 結果表示」** を置き、 実際に保存される内容を opt-in 同意の
  前に user 自身が確認できるようにする。 「何が記録されるか分からない」 という同意の
  心理障壁を下げ、 後からの不安・離脱を防ぐ
- 追跡履歴の全削除 / 期間削除 UI
- 追跡データが telemetry / crash 報告経路に混入しないことを audit
- 横展開: `PERSONAL_DATA_LEAK_AUDIT` 系の観点で新規時系列テーブルを点検

## 受け入れ条件

技術項目は数値・機械検出可能な形で書く。 「品質を上げる」 のような抽象表現は使わない。

- [ ] T1 recorder が opt-in ON 時のみ起動、 idle/AFK 検出が動作、 recorder 稼働中の
      CPU 使用率増分が実測で平均 1% 未満
- [ ] T1 SMTC で複数プレイヤー横断のメディア取得が動作
- [ ] T2 ブラウザ 3 種でアクティブタブのドメインが UIA 取得、 失敗時フォールバック動作。
      UIA 取得対象が「ブラウザ URL + 既知アプリのドキュメント名」 の定義集合に収まり、
      汎用スクレイプがないことを確認
- [ ] T2 取得失敗率が記録され、 データ品質メーターに反映。 失敗率が閾値超過時に理由 +
      修正アクションが UI に表示される
- [ ] T3 アプリ別 CPU/RAM が取得・表示。 GPU/熱/電力は stretch 扱いで未達でも phase 完了可
- [ ] T3 原因候補ビューが「CPU ピーク時刻 → 前面アプリ → 同時刻の上位プロセス → 実行時間」
      を 1 パネルで表示
- [ ] T4 時系列テーブルが migration 追加、 downsampling + pruning ジョブが動作、 長期運用で
      DB サイズが上限内に収まることを検証
- [ ] T4 `sessionized_activity` 集約テーブルが生イベントからセッション帯を生成し、
      タイムラインの帯描画に使われる。 生イベントから再生成可能
- [ ] T4 downsampling の可視化品質: 縮約後の日次合計の誤差 < 2%、 カテゴリ比率の誤差 < 3%
      を自動テストで検証
- [ ] T5 match engine が §match key 戦略どおり item 照合、 真の利用頻度 / 未登録レコメンド /
      tag カテゴリの 3 連携が動作
- [ ] T5 各 match が `confidence` + `match_reason` を保存、 `low` 信頼の活動が UI で
      「未分類 / 低信頼」 として可視化され、 その場の修正導線を持つ
- [ ] T6 Activity Insight 画面が新トップレベル screen として追加、 ナビに
      Library / Workspace / Activity の 3 タブ、 e2e + axe pass (PQ-300 基準)
- [ ] T6 固定トップサマリ帯が画面最上部に常設、 スクロールなしで 5 要素 (総アクティブ
      時間 / 最大カテゴリ / 最長アプリ / 昨日比 / 現在状態) を表示
- [ ] T6 タイムラインがセッション帯で描画され、 日次/週次グラフ脇に自動インサイト文を
      常設 (比較基準 = 昨日 / 先週同曜日)
- [ ] T6 未登録推薦が週次レビューカード「今週の候補 3 件」 として常設、 各候補から
      ワンクリックで item 登録できる
- [ ] T6 データ品質メーター (High / Partial) が画面右上に常設表示
- [ ] T6 Activity サマリ widget が Workspace 配置可・本体画面へ deep-link、 WidgetType enum
      拡張 (`audit-widget-coverage.sh` 0 violations)
- [ ] T6 画面 doc `docs/l2_foundation/screens/activity.md` を新設
- [ ] **見やすさ (§ガイド原則の成功基準)**: 主要インサイトに 3 秒以内で到達、
      fresh-eye『読める』判定 pass、 craft 基準準拠、 ActivityWatch 比で「どこに時間が
      行ったか」 の読み取りが明確に速い (実機目視 + screenshot で判定)
- [ ] T7 SystemMonitor widget が永続時系列ベースの履歴表示に移行
- [ ] T8 opt-in / 除外リスト / タイトルマスク / 履歴削除が動作、 デフォルト OFF、
      追跡データの外部送信ゼロを audit で確認
- [ ] T8 記録プレビューと「30 秒テスト記録」 が opt-in 同意前に保存内容を提示
- [ ] i18n ja / en 同時実装 (PQ-700 parity 維持)

### 実利用シナリオ (体験完了の判定)

技術項目の達成に加え、 **体験が完了したか**を user ストーリー基準で判定する。 「実装完了」
ではなく「体験完了」 を phase 完了条件とし、 実機 + 実 data scale の seed で検証する:

- [ ] **3 秒理解**: 初回 ON から 1 日後に Activity 画面を開き、 固定トップサマリ帯だけで
      「今日の使い方」 を 3 秒以内に説明できる (fresh-eye で判定)
- [ ] **2 クリック登録**: 週次レビューカードの未登録推薦から 2 クリック以内で item 登録 +
      tag 付与が完了し、 翌日の集計でその item がカテゴリに反映される
- [ ] **低信頼の修正**: 「未分類 / 低信頼」 の活動を UI から 1 操作で正しい item / tag に
      修正でき、 修正が以後の集計に反映される

## 工数感

v2 機能のため概算。 着手時に再見積もりする。

| Task                                     | 工数              | 依存                           |
| ---------------------------------------- | ----------------- | ------------------------------ |
| T1 activity recorder                     | 1.5 週間          | —                              |
| T2 ブラウザタブ取得 (UIA)                | 1 週間            | T1 (per-browser adapter 要)    |
| T3 プロセス別リソース                    | 1 週間            | T1 (GPU stretch は別)          |
| T4 時系列ストレージ + retention          | 1 週間            | —                              |
| T5 item model 連携 (核心)                | 1.5 週間          | T1 / T4                        |
| T6 Activity Insight 画面 + サマリ widget | 3 週間            | T4 / T5、 既存 screen システム |
| T7 SystemMonitor 履歴化 (第 2 段)        | 1 週間            | T4                             |
| T8 プライバシー設計実装                  | 1 週間            | T1 (横断、 設計初期から)       |
| **第 1 段合計** (T1-T6 + T8)             | **9-10 週間**     | —                              |
| **第 2 段** (T7 + GPU stretch)           | **2-3 週間**      | 第 1 段完了後                  |
| **総合計**                               | **約 3-3.5 ヶ月** | (PQ-600 widget 規格を流用)     |

第 1 段で「活動追跡 + アプリ別リソース + item 連携 + 見やすい Activity Insight 画面」 が
成立し、 v2 の目玉として出せる。 第 2 段とくに GPU/熱 stretch は v2.x で後追い可能。

## 依存・着手順

1. **着手前提 (必須)**: PH-PQ-700 完了 + **GitHub への v1 リリース完了**。 v1 paid-quality
   sweep が終わり、 製品が世に出てから本 phase に入る
2. **設計流用**: Activity Insight 画面は既存の画面 / route システムに乗せる (新パラダイム
   不要)。 従属サマリ widget は PQ-600 の widget 実装規格 (`WidgetModule` interface /
   enum migration / a11y 基準) をそのまま使う。 SMTC 取得層は本 phase 内 (T1) で実装する
3. **段階内**: T1 / T4 が基盤。 T2 / T3 は T1 に乗る。 T5 は T1+T4、 T6 (画面 + 従属 widget)
   は T4+T5。 T8 プライバシーは T1 と同時並行 (設計初期から組み込む)
4. **後続**: なし。 本 phase が v2 の中核機能

## 横展開チェック

- 新トップレベル画面 Activity は既存の screen / route システムに乗せる、 新パラダイム
  追加なし。 ナビタブ追加で Library / Workspace の既存遷移・hotkey が壊れないこと
- WidgetType enum 拡張 (従属サマリ widget) で `audit-widget-coverage.sh` (Rust enum ↔
  TS bindings ↔ i18n の 3 点同期) が 0 violations
- 新規時系列テーブルを `PERSONAL_DATA_LEAK_AUDIT` 系の観点で点検、 追跡データが
  telemetry / crash 報告 / 外部送信経路に混入しないこと
- UIA 取得対象が doc 定義集合 (ブラウザ URL + 既知アプリのドキュメント名) を超えて
  いないこと。 暗黙拡大は禁止、 増やすなら本 doc 更新が先 (§UI Automation の活用範囲)
- recorder は watcher と同じく opt-out 可能・低負荷であること (「観測で重くなる」 を防ぐ)
- i18n: 追跡カテゴリ・widget 文言を ja / en 同時 release (`do-it-now-philosophy`、
  「ja で merge、 en 後追い」 禁止)
- レイヤー固定枠遵守: recorder → services → repositories → DB。 repository 直呼び・
  repository 間相互参照禁止
- match engine の照合は item の rename / 削除に追従 (古い match key の stale 化を防ぐ)
- `sessionized_activity` / downsampling など集約データは生イベントから常に再生成可能に
  保つ。 集約ロジックを変えたら過去分を作り直せること (集約結果を唯一の真実にしない)
- downsampling は §T4 の可視化品質基準 (日次合計誤差 < 2% / カテゴリ比率誤差 < 3%) を
  自動テストで継続的に守ること

## 参照

- 既存 SystemMonitor widget: `src/lib/widgets/system-monitor/` /
  履歴 buffer `src/lib/utils/history-buffer.ts` (in-memory・揮発、 T7 で永続化)
- 既存 watcher 機構: `src-tauri/src/watcher/` (recorder の兄弟、 イベント駆動 vs ポーリング)
- item 種別 enum: `src-tauri/src/models/item.rs:5-11` (`Exe`/`Url`/`Folder`/`Script`/`Command`)
- widget enum: `src-tauri/src/models/workspace.rs:9-31`
- 既存画面カタログ (新設 `activity.md` の体裁参照): `docs/l2_foundation/screens/`
  (`palette.md` / `library.md` / `workspace.md` / `settings.md` / `onboarding.md`)
- widget 実装規格: [`PH-PQ-600 §Routine widget 実装規格`](./PH-PQ-600_widget-expansion.md)
- craft / a11y 基準: [`PH-PQ-300 Craft Sweep`](./PH-PQ-300_craft-sweep.md)
- 過去の SystemMonitor 履歴化検討: `docs/l3_phases/_archive/PH-20260426-322_system-monitor-history-disk.md`
- Windows SMTC API: [SystemMediaTransportControls](https://learn.microsoft.com/en-us/uwp/api/windows.media.systemmediatransportcontrols)
- 競合 (見やすさで超える対象): ActivityWatch — open-source 活動追跡、 拡張必須・手動カテゴリ分けが弱点
- 設計の固定枠 / 禁止事項: [`CLAUDE.md`](../../../CLAUDE.md)
- 過去 audit (プライバシー観点): `docs/l3_phases/audit/PERSONAL_DATA_LEAK_AUDIT_2026-05-20.md`
