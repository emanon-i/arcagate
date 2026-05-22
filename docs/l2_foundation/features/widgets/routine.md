# Routine Widget

> widgetType: `routine` / category: library / 配置画面: [Workspace](../screens/workspace.md)

## 目的

複数の Library item を束ねて **1 クリックで全部まとめて起動する**マルチ起動 widget。例:「開発開始」routine = エディタ + ターミナル + チャット + 案件フォルダ を 1 ボタンで一斉起動。「散在する起動元を 1 箇所に集約」という Arcagate の core 価値を、作業開始 / 終了の場面でそのまま増幅する。

## やること (必要処理)

- `items[]` で指定した Library item を束ね、起動 button と item 一覧を表示
- 起動 button click で `items[]` の各 item を順に起動 (cascade resolve は使わず `launchItem` の既定経路)
- `launch_delay_ms` が指定されていれば各起動の間に待機 (0〜10000ms にクランプ)
- 1 件の起動が失敗しても残りの起動を止めない (per-item try/catch)
- 起動結果を toast でまとめて通知 (`成功 / 総数`、失敗があれば失敗件数も)
- 削除済 (stale) item id は起動から skip し、一覧に「削除済み」 badge で明示
- Settings dialog で item の追加 / 並び替え / 削除 / 全解除、routine 名、起動間隔を編集

## やらないこと (禁止 / scope 外)

- 新しい launch 機構を作らない (既存 `launch_service` / `cmd_launch_item` を流用)
- routine 専用の item 複製をしない (登録 item を id 参照、rename / 削除に追従)
- file system を scan しない (Library 登録済 item の参照のみ)
- 起動の並列化・依存グラフ・条件分岐はしない (順次起動のみ、輪郭を小さく保つ)
- 単一 item の個別起動 UI は持たない (それは Item widget の役割)

## 性能予算

- 描画は itemStore の reactive read のみ。IPC は起動操作時のみ
- 一斉起動は逐次。`launch_delay_ms` 待機を除けば main thread を block しない
- 設定変更 → 反映は config の再 parse のみ (instant-feedback rule ≤50ms)

## 副作用 (state 変化 / persistence)

- widget config (`items` / `label` / `launch_delay_ms`) を `workspace_widgets.config` JSON に保存
- 起動操作は `launch_log` / `item_stats` を更新 (`launch_service` 経由、各 item ごと)

## 依存

- IPC: `cmd_launch_item` (`launchItem` 経由、script 確認ダイアログ込み)
- DB: `items` (itemStore 経由で read)
- config schema: `items: string[]` (item id 列、default `[]`) / `label: string` (default 空 → widget 既定名にフォールバック) / `launch_delay_ms?: number` (0〜10000、default 0)
- backend: [Launcher](../backend/launcher.md)

## 既知の判断

- config の item id 列の field 名は `items` (PH-PQ-600 plan doc の config schema に準拠)。Item widget の `item_ids` とは別 widget のため独立
- stale id は config から自動削除しない。user が Settings で明示的に外せるよう一覧に残し、起動時のみ skip する
- 1 件失敗で全体を止めないのは plan doc B の受け入れ条件。失敗は toast で集計通知し、成功した起動はそのまま活かす
