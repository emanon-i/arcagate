# Use Cases — Arcagate 想定ユーザケース

batch-90 PH-405 で agent が想定したケース集。実際のユーザ操作を walkthrough する基準点。
不足 / 修正は agent が必要に応じて追加可（生もの、固定しない）。

## 凡例

- **目的**: そのケースで達成したいこと
- **典型操作**: パレット起動から完了までのステップ
- **UI 要素**: 触る画面 / コンポーネント
- **想定時間**: 慣れたユーザの所要時間（参考）

---

## 1. ゲーム起動（Steam / 同人 / 単体 exe）

- **目的**: 「あのゲーム遊びたい」→ 1 クリックで起動
- **典型操作**: ホットキー `Ctrl+Shift+Space` → ゲーム名入力 → Enter / Workspace の Favorites widget をダブルクリック
- **UI**: Palette / Workspace（Favorites widget）/ Library（カードクリック）
- **想定時間**: 2 秒以内（パレット）/ 1 クリック以内（Workspace pinned）

## 2. 同人ゲームライブラリ

- **目的**: ダウンロードしたゲームフォルダ群を Library に集約、サムネイル + タグで管理
- **典型操作**: Library に追加（D&D or + ボタン）→ タグ付け（同人 / RPG / etc）→ 4:3 カードで一覧 → 起動
- **UI**: Library Main Area / LibraryDetailPanel / LibraryCard
- **想定時間**: 追加 10 秒、起動 2 秒

## 3. プロジェクト開始（IDE / ターミナル / ブラウザ）

- **目的**: 作業を始める時に「このプロジェクト関連の起動元」を一気に立ち上げる
- **典型操作**: Workspace の Projects widget からプロジェクト選択 → 関連ツール一括起動 / または Library で「project-foo」タグ検索 → 必要なものを順次クリック
- **UI**: Workspace（Projects widget）/ Library（タグ検索）
- **想定時間**: 1 アクション（Workspace pinned）or 5 秒（タグ検索）

## 4. 日次月次タスク

- **目的**: 毎日 / 毎月のチェックリスト消化
- **典型操作**: Workspace の DailyTask widget で項目確認 → チェック
- **UI**: Workspace（DailyTask widget）
- **想定時間**: 視認 1 秒、チェック 1 操作

## 5. フォルダ整理（exe / ディレクトリ監視）

- **目的**: 監視中のフォルダに新しい exe / プロジェクトフォルダが出現したら自動でアイテム化
- **典型操作**: Settings / Workspace で監視フォルダ設定 → ExeFolder widget / Projects widget で確認 → 不要なものは Library で hide
- **UI**: Workspace（ExeFolder widget / Projects widget）/ Library（可視/不可視）
- **想定時間**: 設定 1 回、以降は自動

## 6. クリップボード再利用

- **目的**: 過去にコピーしたテキストを再利用
- **典型操作**: ClipboardHistory widget から履歴選択 → クリックでコピー
- **UI**: Workspace（ClipboardHistory widget）
- **想定時間**: 2 操作（widget スクロール + クリック）

## 7. メモ・アイデア

- **目的**: 思いついたメモを即座に記録
- **典型操作**: Workspace の QuickNote widget で書く（自動保存）
- **UI**: Workspace（QuickNote widget）
- **想定時間**: タイプ開始まで 0 操作（既に表示）

## 8. ファイル検索

- **目的**: 特定ファイル名 / フォルダを探す
- **典型操作**: FileSearch widget でクエリ入力 → 結果から起動 / または Library 検索バーでアイテム検索
- **UI**: Workspace（FileSearch widget）/ Library（検索バー）
- **想定時間**: クエリ + 結果クリック = 5 秒

## 9. 設定変更

- **目的**: ホットキー / 自動起動 / Library カードサイズ等を変更
- **典型操作**: Settings ボタン → カテゴリ選択（General / Workspace / Library / Appearance / Data / About）→ 項目変更
- **UI**: Settings Panel（2 ペイン navigation）
- **想定時間**: 5 秒（カテゴリ + 1 項目）

## 10. テーマ切替

- **目的**: ダーク / ライト / カスタムテーマ切替
- **典型操作**: Settings → Appearance → テーマカード選択（即時反映）/ カスタムテーマは「コピーして編集」
- **UI**: Settings（Appearance）/ ThemeEditor（dynamic import）
- **想定時間**: 切替 2 秒、編集開始まで 5 秒

---

## 観察ポイント（walkthrough 時）

各ケースで:

1. **想定どおり動くか?**
2. **クリック数 / 想定時間内?**
3. **「次に何すればいい?」が UI 上で明確?**
4. **エラー時の挙動は?**（toast 出る? 復旧導線ある?）
5. **空状態 / 初回時の挙動は?**

`use-case-friction.md` に上記観点で結果記録。
