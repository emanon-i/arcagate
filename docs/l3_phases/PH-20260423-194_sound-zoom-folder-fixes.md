---
status: wip
phase_id: PH-20260423-194
title: サウンド再生・ズームスライダー・フォルダ起動 修正調査
category: バグ修正
scope_files:
  - src/lib/utils/sfx.ts
  - src-tauri/src/launcher/mod.rs
parallel_safe: false
depends_on: []
---

## 目的

実機で以下 3 件が動作しない:

1. パレット Enter 実行時にクリック音が鳴らない
2. Settings > ズームスライダーが反映されない
3. フォルダアイテムがエクスプローラーで開かない

## 各修正方針

### 1. サウンド（AudioContext autoplay policy）

`getContext()` で `ctx.resume()` を `void` で fire-and-forget しているため、
`suspended` 状態のまま `osc.start()` が呼ばれる可能性がある。

`playClick` を async に変更し、`resume()` を await してから音を鳴らす:

```ts
export async function playClick(volume: number): Promise<void> {
    if (volume <= 0) return;
    try {
        const ac = getContext();
        if (ac.state === 'suspended') {
            await ac.resume();
        }
        const now = ac.currentTime;
        // ... oscillator 生成 (変更なし)
    } catch {
        // ignore
    }
}
```

PaletteOverlay の呼び出し側は `void playClick(...)` で OK（best-effort）。

### 2. ズームスライダー

`SettingsPanel.svelte` の `<input type="range">` で `value={configStore.widgetZoom}` が
Svelte 5 で双方向に機能していない可能性。`oninput` は正しく動いているが、
`setWidgetZoom` の snap ロジックによりスライダー表示値と内部値がずれる場合がある。

対処: 実機確認でスライダーは実際に動くかを確認する。
もし動かないなら `bind:value` の代替として $state ローカル変数を使う。

**現時点では INVESTIGATE** — コードは正しく見えるため実機で再確認。

### 3. フォルダ起動（launcher/mod.rs）

`launch_folder` は `explorer.exe <path>` で起動。パスにスペースが含まれる場合、
`Command::arg(path)` は適切にクォートするため問題なし。

しかし `explorer.exe path` の起動でプロセスが終了コード 1 を返す場合、
`spawn()` 自体は成功するが実際には開かない。

対処: `cmd.exe /c start "" "path"` 形式に変更してシェル経由で開く:

```rust
pub fn launch_folder(path: &str) -> Result<(), AppError> {
    Command::new("cmd")
        .args(["/c", "start", "", path])
        .spawn()
        .map_err(|e| AppError::LaunchFailed(e.to_string()))?;
    Ok(())
}
```

これは `launch_url` と同じパターンで、シェルがパスの解決とウィンドウ管理を行う。

## 検証

- `cargo test` 通過
- 実機: パレットで Enter → クリック音が鳴る
- 実機: Settings ズームスライダーを動かす → Workspace のウィジェットサイズが変わる
- 実機: フォルダアイテムを実行 → エクスプローラーが開く
