---
id: PH-20260426-295
status: todo
batch: 68
type: 改善
---

# PH-295: メタデータ拡張（image / video / music / exe）

## 参照した規約

- `arcagate-engineering-principles.md` §2 フロント/バック分担: ファイル format 解析は Rust
- batch-66 PH-285 (folder / file / url 実装済み)
- メモリ `project_library_card_spec.md` G. メタデータ表示

## 背景・目的

batch-66 で folder / file / url の最低限を実装。残り image / video / music / exe を batch-68 で追加。

## 仕様

### Rust 拡張

`services/metadata_service.rs` に追加:

| item_type | フィールド                                                                      | 取得方法                                                                                                       |
| --------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| image     | `image_dimensions`, `image_format`                                              | `image::image_dimensions()` (既存依存検討、なければ自前 magic byte 解析で PNG/JPEG/GIF/WebP の dimension のみ) |
| video     | `video_duration_secs`, `video_dimensions`                                       | mp4 box parser（自前で `ftyp` + `moov.trak.tkhd` から最小限取得、依存追加避ける）                              |
| music     | `audio_duration_secs`, `audio_id3_title`, `audio_id3_artist`, `audio_id3_album` | mp3 ID3v2 frame 解析（自前、ヘッダ + tag size + TIT2/TPE1/TALB のみ）                                          |
| exe       | `exe_version`, `exe_company`                                                    | Windows PE Resource Section (VS_VERSION_INFO) - PE crate 検討 or 簡易 parser                                   |

依存追加判断:

- `image` crate: 既存依存（icon 生成？確認）
- `mp3-metadata`, `mp4parse`: 追加候補
- `pe-rs` or 自前 PE parser: exe 用

依存予算 §5 に従い計測 → 追加可否判断。

### Frontend

`utils/format-meta.ts` の `formatItemMeta` を拡張:

- `image`: line1 = `{w}×{h}`, line2 = format（PNG/JPEG 等）
- `video`: line1 = `{duration}`, line2 = `{w}×{h}`
- `music`: line1 = `{title}`（ID3）, line2 = `{artist} - {album}`
- `exe`: line1 = `v{version}`, line2 = `{company}`

`ItemMetadata` 型に追加フィールド（camelCase）。

## スコープ調整

依存追加が大きい場合は、まず image + exe のみ実装し、video / music は batch-69 へ。

## 受け入れ条件

- [ ] image アイテムで dimensions + format が表示される（少なくとも PNG/JPEG）
- [ ] exe アイテムで version + company が表示される
- [ ] 失敗時は空オブジェクト（best-effort、既存挙動と整合）
- [ ] Rust 単体テスト 4 type 各 1 ケース
- [ ] 依存予算違反していない（計測ログを dispatch-log に記録）
- [ ] `pnpm verify` 全通過
