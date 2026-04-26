---
id: PH-20260427-386
status: done
batch: 86
type: 改善
era: Polish Era
---

# PH-386: About ダイアログ + version 表示

## 参照した規約

- `docs/l0_ideas/arcagate-engineering-principles.md` §9 「他人に渡しても困らない」: README + 初回セットアップ完走
- 配布水準を主張するには「アプリの正体」が分かる UI が必要

## 横展開チェック実施済か

- 現状 About ダイアログは未実装
- バージョン文字列は package.json (`0.1.0`) と Cargo.toml (`0.1.0`) で同期、tauri.conf.json も同じ
- ライセンスファイル LICENSE は GitHub public 上は MIT を想定（要確認）

## 仕様

### About ダイアログ

`src/lib/components/common/AboutDialog.svelte` を新設:

- アプリ名 / ロゴ（icon.png から流用）
- バージョン (Tauri から `getVersion()` で取得 or build-time `__APP_VERSION__`)
- 説明: 「PC上に散在する起動元を集約する個人用コマンドパレット」
- 著者 / リポジトリ URL
- ライセンス表示
- 「Close」ボタン

### Settings から開く

`SettingsPanel.svelte` に「About」カテゴリを追加（既存の general / data の隣）:

- 単純なテキスト + リンクボタンで構成
- ロゴ表示（既存 `src-tauri/icons/icon.png` を使用）

### バージョン取得

`@tauri-apps/api/app` の `getVersion()` を使用（runtime に Cargo.toml バージョンを反映）:

```typescript
import { getVersion } from '@tauri-apps/api/app';
const version = await getVersion();
```

## 受け入れ条件

- [x] AboutSection.svelte 新設（Dialog ではなく Settings 内のセクションとして実装）
- [x] SettingsPanel + nav-items.ts に About カテゴリ追加（Info icon）
- [x] `getVersion()` + `getTauriVersion()` で動的取得（hardcode なし）
- [ ] e2e: batch-87 で追加（Settings > About 表示確認）
- [x] `pnpm verify` 全通過

## 完了ノート（batch-86）

「ダイアログ」ではなく「Settings 内のセクション」に変更。理由:

- Settings は既に 2 ペイン化されており、About を別 Dialog にすると一貫性が崩れる
- `data-testid="about-app-version"` で e2e から識別可能

## SFDIPOT 観点

- **C**laims: README / About / バージョン番号が一貫
- **U**ser expectations: 「このアプリは何？」「バージョンは？」が 1 クリックで分かる
