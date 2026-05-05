# Support

Arcagate を使っていて困ったとき / バグを見つけたときの連絡経路と既知 issue の参照先。

## バグ報告 / 機能要望

### GitHub Issues

[github.com/emanon-i/arcagate/issues](https://github.com/emanon-i/arcagate/issues) で受け付け。報告時は以下を含めると対処が早い:

- **Arcagate のバージョン** (Settings → About で確認)
- **Windows のバージョン** (例: Windows 11 23H2)
- **再現手順** (1, 2, 3... 形式で)
- **期待した動作 / 実際の動作**
- **エラーメッセージ** (toast に出ている文言、または log file の該当行)
- **screenshot / 録画** があれば

#### log file の場所

```
%LOCALAPPDATA%\arcagate\logs\arcagate.log
```

最新 5MB × 7 世代まで rotate 保持されている。報告時に直近の `arcagate.log.0` を添付すると trace が早い。

### GitHub Discussions

[github.com/emanon-i/arcagate/discussions](https://github.com/emanon-i/arcagate/discussions) で機能要望 / ベストプラクティス共有 / 質問。

## 既知 issue / lessons learned

- **既知 issue 一覧 (Library overhaul 関連)**: [docs/l3_phases/_archive/library-overhaul/](../l3_phases/_archive/library-overhaul/)
- **過去の落とし穴 / 再発防止**: [docs/lessons.md](./lessons.md)

## クラッシュレポート / テレメトリ

Arcagate は **オプトイン式の crash report / telemetry** を実装している (default OFF)。Settings → Privacy で切替え可能。

- 送信先: Sentry endpoint (詳細は Settings → Privacy のリンク)
- 送信内容: panic stack trace (file path は `<APPDATA>` で redact 済)、telemetry counter (operation 名 + duration、PII 含まず)
- いつでも opt-out 可能、opt-out 後の送信は停止

## SmartScreen / Defender 警告

Arcagate は当面 **未署名で配布** (GitHub Releases)。Win11 で installer 実行時に「Windows がコンピュータを保護しました」 dialog が出る:

1. 「詳細情報」をクリック
2. 「実行」 button が現れるのでクリック

不審な場合は SHA256 を release page と照合してから実行することを推奨。

## サポート対象

- **Windows 11 64bit のみ**。macOS / Linux は scope 外。
- 個人開発のため対応は **best-effort**、SLA / 保証なし。

## 開発参加

開発に関わりたい場合は [README.md](../README.md) の「開発」 節 + [CLAUDE.md](../CLAUDE.md) を参照。
