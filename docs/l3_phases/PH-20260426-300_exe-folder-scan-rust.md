---
id: PH-20260426-300
status: todo
batch: 69
type: 改善
---

# PH-300: Rust `cmd_scan_exe_folders` IPC（folder scan + 候補 exe list）

## 横展開チェック実施済か

- 既存 `cmd_auto_register_folder_items` (services/item_service.rs) の folder scan ロジックと比較、scan 機能を共通化できる箇所は service レベルで切り出す
- `cmd_extract_item_icon` の icon 抽出ロジックを再利用（exe アイコン抽出）
- `cmd_get_item_metadata` (PH-285) の file size 取得ロジックと共通化候補

## 参照した規約

- `arcagate-engineering-principles.md` §2 フロント/バック分担: ファイル I/O は Rust
- batch-66 PH-285（メタデータサービス基盤）
- batch-64 PH-278（fs watcher service layer）

## 背景・目的

ユーザ要望: 「同人ゲーム / ツールフォルダを置くだけで即起動できるライブラリ」。
1〜3 階層可変で folder scan → サブフォルダ内の exe を最大サイズで自動選択 → クリック起動。

## 仕様

### 新規 IPC

`commands/widget_commands.rs` に追加（または `metadata_commands` 拡張）:

```rust
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExeFolderEntry {
    pub folder_path: String,
    pub folder_name: String,
    pub exe_candidates: Vec<ExeCandidate>,
    pub icon_path: Option<String>, // sub folder 内の *.ico を優先
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExeCandidate {
    pub path: String,
    pub size_bytes: u64,
    pub name: String,
}

#[tauri::command]
pub fn cmd_scan_exe_folders(
    root: String,
    depth: u8, // 1..=3 にクランプ
) -> Result<Vec<ExeFolderEntry>, AppError>;
```

### 動作

- root ディレクトリ配下を `depth` 階層まで再帰
- 各サブフォルダで `.exe` を全件取得（拡張子大文字小文字区別なし）
- サブフォルダごとに `ExeFolderEntry` を 1 件生成
- `exe_candidates` は size_bytes 降順
- `*.ico` がサブフォルダ内にあれば `icon_path` に最初の 1 件
- exe が 0 件のサブフォルダは結果から除外
- depth は `clamp(1, 3)` で安全化

### サービス層

`services/exe_scanner_service.rs` 新規。`std::fs::read_dir` ベース、外部依存追加なし。

### 単体テスト

- 1 階層、2 階層、3 階層の各ケース
- 0 個 exe フォルダの除外
- 複数 exe の size 降順
- depth = 0 や depth > 3 の clamp 動作
- 不在パスで `Vec::new()` 返却（best-effort、AppError なし）

## 受け入れ条件

- [ ] `cmd_scan_exe_folders` が動作（最低 5 単体テスト緑）
- [ ] depth クランプ 1..=3 [Data]
- [ ] 不在 root で空配列返却（best-effort） [Function]
- [ ] icon 抽出は別 IPC `cmd_extract_item_icon` を流用（exe アイコン抽出）[Structure]
- [ ] `pnpm verify` 全通過

## 自己検証

- 実フォルダ（例: D:\Tools の 2 階層）で scan → 期待件数取得
- 大きな root（数千フォルダ）でも `< 500ms` で完了（hot-path bloat 監視）
