---
id: PH-20260425-285
status: todo
batch: 66
type: 改善
---

# PH-285: Library カード メタデータ表示 + Rust IPC

## 参照した規約

- `arcagate-engineering-principles.md` §2 フロント/バック分担: ファイル I/O は Rust
- メモリ `project_library_card_spec.md` G. メタデータ表示
- `docs/desktop_ui_ux_agent_rules.md` §1 情報密度（S は最小、L は多め）

## 背景・目的

batch-65 で Library カードの 4:3 / S/M/L / 背景 3 モード / focal point / 文字スタイルが完成。
仕様 G「メタデータ表示」だけ batch-66 に申し送り済。

ユーザ確定仕様:

| item_type | 表示メタデータ          |
| --------- | ----------------------- |
| folder    | 中の数 + 合計サイズ     |
| file      | サイズ + 最終更新日時   |
| text      | プレビュー先頭          |
| music     | 再生時間 + ID3 タグ     |
| image     | 解像度 + フォーマット   |
| video     | 再生時間 + 解像度       |
| exe       | バージョン + 開発元     |
| url       | ドメイン + 最終アクセス |

S サイズは表示量最小、L はフル。M は中庸。

## 仕様

### Rust IPC

新規 `cmd_get_item_metadata(item_id: String) -> ItemMetadata`:

```rust
#[derive(Serialize)]
pub struct ItemMetadata {
    pub size_bytes: Option<u64>,
    pub modified_at: Option<String>,    // ISO 8601
    pub child_count: Option<u32>,
    pub folder_total_bytes: Option<u64>,
    pub image_dimensions: Option<(u32, u32)>,
    pub image_format: Option<String>,
    pub video_duration_secs: Option<u32>,
    pub audio_duration_secs: Option<u32>,
    pub audio_id3: Option<Id3Tags>,
    pub exe_version: Option<String>,
    pub exe_company: Option<String>,
    pub url_domain: Option<String>,
    pub url_last_accessed: Option<String>,
}
```

実装は item_type ごとに service を分岐:

- `folder`: `std::fs::read_dir` で entries 数 + walk で総サイズ
- `file/text`: `std::fs::metadata` で size + mtime、text は最初の N 文字を別 IPC で取得
- `image`: `image` crate の `image::image_dimensions()`（軽量）
- `music/video`: 既存依存を使う（追加依存避ける、まずは file size + mtime のみ）
- `exe`: PE header 読み（軽量）。重ければ skip
- `url`: `target` から `url::Url::parse(&target).host_str()`

最初の段階では folder / file / image / url のみ実装、music/video/exe は次サブフェーズに分割可（dispatch-log で記録）。

### フロント側

`LibraryCard.svelte` の下部オーバーレイにメタデータ追加:

```svelte
{#if metadata}
  <div class="text-[10px] opacity-70" style={labelStyle}>
    {formatMeta(item, metadata)}
  </div>
{/if}
```

`formatMeta()` は `src/lib/utils/format-meta.ts` で item_type ごとに表示文字列を生成。

メタデータ取得タイミング: LibraryCard mount 時に lazy 取得（`$effect` で IPC を非同期発火）。すべての item を一斉取得しない（N+1 防止）。

サイズ追従:

- S: メタデータ非表示
- M: 1 行（サイズ or ドメイン等）
- L: 2 行（サイズ + 日時、解像度 + フォーマット 等）

## 受け入れ条件

- [ ] `cmd_get_item_metadata` が folder / file / image / url の最低 4 type で動作 [Function]
- [ ] LibraryCard が S サイズでメタデータ非表示、M で 1 行、L で 2 行 [Operations]
- [ ] N+1 IPC が起きない（item ごと 1 回のみ）[Time]
- [ ] エラー時はメタデータ非表示（aborted gracefully）[Function]
- [ ] Rust 単体テスト 4 type ぶん緑 [Structure]
- [ ] `pnpm verify` 全通過

## 自己検証（CDP）

- L サイズで folder アイテムを表示、子要素数 + 合計サイズが見える
- M サイズで切替、1 行のみ表示
- S サイズで切替、メタデータ非表示
- 同じカードで mtime / 解像度が見えるかスクショ確認
