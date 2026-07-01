# Arcagate — Motivation (L0)

L0 = 「**なぜ・どうしてやりたいか**」を集約する開発者要求 layer。ID 無し、 開発が進むと変わらない stable layer。

---

## (a) なぜ作るか

PC 上に散在する起動元 (Steam / DMM ゲーム / ブラウザゲーム / 各種ランチャー / 開発ツール / PowerShell スクリプト / URL ...) を 1 箇所に集約し、 「**ホットキーから 2 秒以内に何でも起動できる**」 状態を作る。

毎日の起動コストが下がる事自体が価値。 既存のランチャー代替ツール (Raycast / Flow Launcher / Listary / Playnite) はゲーム特化か開発ツール特化のどちらかで、 両方を同一モデルで扱えるツールが存在しない。 Arcagate は `.exe / URL / フォルダ / スクリプト / コマンド` を全て **同一アイテムモデル**で扱う。

### V2 の動機 — 「起動後の時間」 が blind spot

launcher は「**起動の瞬間**」 しか見ていない。 1 日のうち実際に何のアプリをどれだけ使い、 何を聴き、 **どのファイルを作り書き換えたか** — その「**起動後の時間**」 は完全に記録されていない。 業務の月次所感を書こうとして「今月何をしていたか思い出せない」 と気付いたのが V2 の原体験 (= dogfooding)。 既存の活動追跡ツール ActivityWatch は「正しいことをやっているのに使いづらい」 — データは持っているのに読めない / 手動カテゴリ分けが苦痛 / **標準では窓とアプリ名しか取れず、 メディア・ファイル操作・実操作の濃淡が落ちる** / watcher ごとにデータが分断され統合像が無い。 V2 は **この弱点を全部潰した Windows ネイティブの低負荷パーソナル活動トラッカー**を目指す。

---

## (b) 何を作りたいか

「**よく磨かれた工具**」 のような毎日使う個人ランチャー。 精密で信頼でき、 冷たくはなく、 使うほど手に馴染む。

### 機能の核

| 機能          | 内容                                                                            |
| ------------- | ------------------------------------------------------------------------------- |
| **Palette**   | Ctrl+Shift+Space で呼び出し、 名前で fuzzy 検索 → Enter で起動。 最速経路       |
| **Library**   | 全アイテムを統一カード UI で管理。 D&D で即登録、 タグで分類、 起動頻度ソート   |
| **Workspace** | widget を自由配置するホーム画面。 シナリオ別ページ (Gaming / Dev など) を作れる |
| **Tray 常駐** | バックグラウンドで動作、 どの画面からでも呼び出し可                             |

### V2 の機能核 (パーソナル活動トラッカー)

| 機能                | 内容                                                                                                                   |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **活動ログ収集**    | 窓 / 実操作 (放置 vs 能動) / 再生メディア / **ファイル操作 (作成・編集・削除・リネームを path 単位)** を標準で全部取る |
| **統合ビュー**      | watcher 縦割りでなく、 時間軸で全信号を 1 つに合流。 「その時何をしていたか」 を横断で見せる                           |
| **glanceable UI**   | 「今日どこに時間が行ったか」 を一目で。 毎日眺めたくなる (= table stakes)                                              |
| **Obsidian export** | 自分のデータを CLI / UI から自由に抜き出す。 月次振り返りに貼れる Markdown を第一に、 CSV / JSON / 生も                |

**芯**: 「**ファイル / パス単位の操作ログを蓄積・集約し、 後から path 経由で調査できる**」。 AI が生成・編集したファイルも Git 外の変更も捕捉でき、 **Git を補完する活動記録**になる。 「毎日眺める UI」 と「データを抜き出せる export」 は二者択一でなく両輪。 完全ローカル (外に一切出さない) ゆえにフル捕捉できる。

### 哲学

- 「**毎日使えるか？**」 で全機能を判断、 微妙なら削る
- **PC に絶対負荷をかけない** — 常駐監視でも CPU / IO / メモリ / 電力を食わない。 「観測しているせいで重くなる」 は本末転倒 (V2 の一級制約)
- **特権は最小・分離** — フル捕捉に要る管理者権限は「読むだけ・コード実行能力ゼロ」 の収集コンポーネントに閉じ込め、 起動機能 (launcher) は非特権のまま。 特権側を任意実行の踏み台にしない
- **設定変えたら即見た目が変わる** — 遅延反映は欠陥
- アニメーションは「動き始めと終わりが緩やかにつながる」 中割スタイル (日本のリミテッドアニメーション easing)、 100ms 以内に視覚反応開始
- 操作が確実に動く + 操作結果が見える、 この 2 点が最優先。 装飾は後

---

## (c) 誰のため

**自分自身 (開発者)**。 ゲームも開発ツールも日常的に多数使い分けており、 起動までの手数を最小化したい。 キーボード操作を好む。

- ゲーム: Steam / DMM / 同人 RPG / DLsite 等の多数ライブラリを横断
- 開発: Blender 複数バージョン / VS Code / Claude Code / 各種 CLI / PowerShell スクリプト
- メモ / クリップボード履歴 / monitored フォルダの可視化を 1 画面に統合したい

将来的に配布・販売の選択肢は開いておく (GitHub public)、 daily-use を磨き続ける事が最優先。

Microsoft Store 配布 + 海外展開を計画に含み、 i18n architecture (= `t('key')` wrapper + locale store + `messages_<locale>.json`) を整備する。 default locale = `ja`、 en / 他言語 expansion ready。

---

## (d) やらないこと (Non-goals)

- **クラウド同期** — ローカル完結が原則、 1 PC daily-use にフォーカス
- **Linux / macOS ネイティブ対応** — クロスプラットフォームは設計上意識するが対応しない
- **ターミナルエミュレータ統合** — スコープ外
- **ファイルマネージャー / セマンティック検索** — Explorer / Listary が既に解決
- **コンテキストメニュー統合 (Shell Extension)** — メンテ負担に見合わない
- **マルチユーザー / 権限管理** — 単独 user 前提
- **ORM 導入** (diesel / sqlx / sea-orm 等) — rusqlite + 生 SQL を維持

### V2 (活動トラッカー) の Non-goals

- **クラウド送信 / 第三者連携** — 活動ログは完全ローカル。 telemetry / crash 報告にも混ぜない。 Grafana 等への push もしない
- **エンタープライズ observability** (アラート / 閾値通知 / 異常検知 / 分散トレーシング) — 「Datadog 沼」 回避、 個人スケールの軽さを守る
- **キーロガー化** — 実操作は「打鍵/移動の量」 の集計のみ、 **キー内容は絶対に記録しない**。 マイク/カメラは (採る場合も) 使用中 boolean のみ
- **特権収集コンポーネントに任意実行機能を足す** — 収集側は USN 等を読むだけ、 プロセス起動/スクリプト実行の能力を持たせない
- **動画 ID 等アプリ内部の深いメタ** — OS SMTC で採れる範囲 (曲/動画のタイトル・アプリ) まで. 深追いはしない
- **全タブ/全ブラウザ網羅のためのブラウザ拡張** — アクティブタブで割り切り、 core は拡張ゼロ

---

## (e) 成功条件

「配布水準を常に狙う」 を品質バーとし、 以下を全達成した状態を成功とする。

### 性能 (numeric pass criteria)

起動 / Palette 表示 / アイテム起動 / Idle メモリ・CPU / exe サイズの数値予算を全て pass すること。
数値の正本は [`l1 vision.md` §UX 標準「パフォーマンス目標値」](../l1_requirements/vision.md#パフォーマンス目標値) (ここでは複製しない)。

### 機能完成度

- 全 widget が daily-use に耐える (現行の集合は `src/lib/widgets/` が単一情報源)
- D&D 経由のアイテム登録が全 type (exe / url / folder / script / image / text) でスムーズ
- Library / Workspace / Palette / Settings の 4 画面が UI 一貫性を持つ
- セットアップウィザード完走で「即使える」 状態に到達

### 安定性

- 通常使用で crash 無し (1 週間以上連続稼働)
- DB 不整合 / 起動失敗 / 設定吹き飛び 無し
- マイグレーション失敗 0 件 (rusqlite_migration が forward-only)

### 主観

- 「**毎日開きたい**」 と思える出来 (`daily-use-test`、 `.claude/rules/workflow.md`)
- 操作後 100ms 以内に視覚反応がある (`instant-feedback`、 `.claude/rules/workflow.md`)
- 「治った」 判定は **user dev 検収** で確定 (`dom-not-fixed`、 `.claude/rules/workflow.md`)

---

## (f) 制約

### 動作環境

- **OS**: Windows x86-64 優先 (x64 onlyと割り切り)
- **WebView2**: Edge ベース (Tauri v2 が前提)
- **配布**: 単体 exe (インストーラ無し)

### 技術スタック (固定枠、 変えない判断)

- **Tauri v2** + **SvelteKit static adapter** + **Svelte 5 runes** + **Tailwind v4** + **shadcn-svelte**
- **Rust** stable + **rusqlite** (`bundled`) + **rusqlite_migration**
- **SQLite** + WAL + UUID v7
- レイヤー: `commands → services → repositories → DB` (逆禁止)
- Service Layer が全 IPC エントリーポイントの共通経路、 Repository を直呼び禁止
- `AppError` は `{ code, message }` Serialize 構造体でフロントへ
- ORM 不使用 (rusqlite + 生 SQL)

### 運用

- ゼロコスト運用 (OSS / 無料 service のみ、 配布前提になるなら code signing 等は別途検討)
- main 直 push OK、 PR は大きな変更単位で任意
- pre-commit lefthook + GitHub CI で品質ゲート
- 「実機目視なしで完了報告」 禁止

---

## (g) 想定する利用形態

### 起動経路

| 経路                              | 用途                                         |
| --------------------------------- | -------------------------------------------- |
| **ホットキー (Ctrl+Shift+Space)** | 最速経路、 任意の画面から palette を呼び出し |
| **Tray クリック**                 | 元から bg 常駐、 メインウィンドウを前面に    |
| **Workspace widget click**        | 配置済 widget からの 1 click 起動            |
| **Library card double-click**     | カード一覧から起動                           |

### 画面遷移

```
Tray / Hotkey ─→ Palette (検索 → Enter) ─┐
                                          │
Main Window ─→ Workspace (widget click) ─┼─→ アイテム起動
              ─→ Library (card click)   ─┘
              ─→ Settings (config 編集)
```

### 典型シナリオ

- **ゲーム起動**: Ctrl+Shift+Space → ゲーム名 一部入力 → Enter
- **Blender 切替**: `blen4` 入力 → Enter
- **Claude Code 起動**: `claude` 入力 → Enter
- **シナリオ別 launcher pad**: Gaming workspace タブで Steam / 同人 widget が見える、 Dev workspace タブで VS Code / Blender / git project widget が見える
- **クリップボード履歴呼び出し**: ClipboardHistory widget からの 1 click paste
- **監視フォルダ visualize**: ExeFolder widget が `D:\Games\` のサブフォルダを exe 候補付きで列挙

---

## (h) 失敗パターン (Anti-goals / 避けたいこと)

### 設計失敗

- **過度にゲームっぽい** — 制作者向けツールなのでプレイヤー UI にしない
- **過度にミニマル** — 何もできなさそうに見える、 機能発見が困難
- **過度に派手** — 毎日使うには疲れる、 常時パーティクル / 雨粒 / スキャンライン 禁止
- **常時 BGM / 環境音** — デスクトップツールに不要
- **複雑な permission / 権限管理** — 1 user 想定なので無駄

### 実装失敗

- 「**DOM 存在 = 治った**」 判定 (`dom-not-fixed` 違反、 `.claude/rules/workflow.md`)
- 「**pnpm verify pass = 治った**」 判定 (lessons.md 系)
- **1 file 直して終わり** で横展開漏れ (CLAUDE.md `lateral-sweep` 違反、 2026-05-13 EXE folder cascade 事例)
- **user に dev 起動 / dump / screenshot 依頼** (CLAUDE.md `agent-self-complete` 違反)
- **color hardcode** (`#ffe600` / `rgba(...)` / `bg-yellow-500` 等)、 必ず `var(--ag-*)` token 経由
- **status: done な L1/L2 doc を書き換え** (history mutation 禁止)
- **`--no-verify` で hook bypass**

### Product Direction 失敗

- **単色ブランドに寄せた派手 direction (旧 Industrial Yellow 路線)**: 配布水準にそぐわず、 daily-use で疲れる。 色は theme accent に追従させる
- **「念のため」 機能の積上げ**: 「微妙なら削る」 哲学に反する
- **「将来対応」 marker UI**: 動かない select option を残すと user 混乱
- **scope creep**: 1 PR が肥大化、 「規模超え → 別 PR」 判断を怠ると merge 困難

---

## 関連 doc

- 全体アーキテクチャ / 技術設計 → [`l2_foundation/foundation.md`](../l2_foundation/foundation.md)
- 画面別機能カタログ → [`l2_foundation/screens/`](../l2_foundation/screens/)
- テストシナリオ ⇄ 実装 mapping → [`l2_foundation/test_scenarios.md`](../l2_foundation/test_scenarios.md)
- 失敗駆動メモリ → [`lessons.md`](../l2_foundation/lessons.md)
- 過去の実装 plan (アーカイブ済) → [`l3_phases/_archive/`](../l3_phases/_archive/)

---

## (i) ビジュアル参照 / mood board (visual-references.md 統合)

## 採用したい雰囲気

### Arknights Endfield（最も参考にする）

ハードサイファイ（SF 軍事系）+ 有機的テクスチャ。深い青灰のベース、シアンのアクセント、情報密度が高くても読みやすい文字階層。等高線（コンタライン）の背景オーバーレイ、ノイズテクスチャ。

**現在の Arcagate dark テーマは既にこの方向性に近い。** 「青みの強化」「ノイズテクスチャ追加」程度で近づける。

### Ubuntu 系おしゃれカスタムデスクトップ（r/unixporn 系）

Frosted Glass（背景透過 + 壁紙がすけて見える）、クリーンな角丸ウィンドウ、スクロールバーが目立たない。**常時パーティクルや雨粒は採用しない。**

## ユーザーの好み（明示）

- **透明感・等高線・すりガラス感**を特に気に入っている → Frosted Glass と等高線テクスチャは積極採用
- **「中割」easing** が好み（動き始めと終わりが緩やかにつながる）→ `cubic-bezier(0.25, 0.46, 0.45, 0.94)` を統一 easing として採用済み

## カラー方向性

```
ダークテーマ : 深い青灰ベース × シアンアクセント（現行維持・強化）
ライトテーマ : 冷たいグレーホワイト × シアンアクセント（現行維持）
Endfield    : より深い青灰 + ノイズテクスチャ追加
Frosted     : 透過感 + 壁紙ブラー
```

Endfield 参考カラー:

```
ベース   : #0a0e14 〜 #0d1117
サーフェス: #141a24 〜 #1a2232
テキスト  : rgba(240,248,255, 0.95) ← わずかに青みがかった白
アクセント: #22d3ee / #67e8f9 (cyan)
サブ     : #fbbf24 (amber / 警告・重要)
```

## 参照リスト

| 参照                      | 採用したい要素                                                  |
| ------------------------- | --------------------------------------------------------------- |
| Arknights Endfield        | 背景テクスチャ、カラーパレット方向、情報密度レイアウト          |
| Honkai: Star Rail         | アイコンの整列・サイズ感                                        |
| Linear App                | マイクロインタラクション全般、深いダーク + 高品質アニメーション |
| Vercel Dashboard          | テーブル・リストの情報密度                                      |
| GNOME + Picom blur        | backdrop-filter blur                                            |
| Windows 11 Mica / Acrylic | ノイズ + ブラーの組み合わせ                                     |
| ジブリ作品                | easing の基準（自然で疲れない動き）                             |

## 採用しないもの

| エフェクト                   | 理由                                  |
| ---------------------------- | ------------------------------------- |
| 雨粒・パーティクル           | 常時 GPU 使用・疲労感                 |
| スキャンライン・CRT          | ゲームすぎる・読みにくい              |
| 不透明度 < 0.7 の本文        | 可読性不足                            |
| フォント過剰カスタマイズ     | ローカルフォント依存は配布を複雑化    |
| Cyberpunk 2077 UI 的なネオン | 強すぎる、Arcagate のトーンに合わない |
