# System Monitor Service

> backend feature / レイヤー: commands → service → OS (sysinfo)

## 目的

CPU / メモリ / ディスク / ネットワークの使用状況を `sysinfo` crate で取得し System Monitor widget へ提供する backend feature。

## やること (必要処理)

- `get_system_stats`: CPU 使用率、メモリ used / total
- `get_disk_stats`: mount ごとの used / total
- `get_network_stats`: interface ごとの累積 rx / tx bytes
- CPU 差分計算のため `System` インスタンスを global Mutex で再利用

## やらないこと (禁止 / scope 外)

- プロセス別リソース / CPU 温度 / バッテリ状態を取らない
- 履歴を保持しない (snapshot のみ。履歴は widget の in-memory buffer)
- 永続化をしない

## 性能予算

- `System::new()` は heavyweight のため再利用必須 (毎回 new しない)
- 各 stat は read-only の軽量取得

## 副作用 (state 変化 / persistence)

- なし (read-only。sysinfo の内部 state 更新のみ)

## 依存

- crate: `sysinfo`
- 依存される: System Monitor widget

## 既知の判断

- network interface はソートして返す (`sysinfo` HashMap の非決定順対策、PH-042 #27)
