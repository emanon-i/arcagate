---
status: wip
phase_id: PH-20260423-148
title: "クリック SE 再生基盤 (Web Audio API)"
depends_on: [PH-20260423-147]
scope_files:
  - src/lib/state/sound.svelte.ts
  - src/lib/utils/sfx.ts
  - src/lib/components/settings/SettingsPanel.svelte
  - src/routes/+page.svelte
  - src/routes/palette/+page.svelte
parallel_safe: false
---

# PH-20260423-148: クリック SE 再生基盤

## 目的

Web Audio API を使ってインライン生成（外部ファイル不要）のクリック SE を実装する。
プライマリボタン確定・コマンドパレット実行の 2 箇所に適用し、設定でミュート可能にする。

## 実装ステップ

### Step 1: sound.svelte.ts 作成

`src/lib/state/sound.svelte.ts` を新規作成:

```typescript
// サウンド設定 state（localStorage で永続化）
const SOUND_ENABLED_KEY = 'sound-enabled';
const SOUND_VOLUME_KEY = 'sound-volume';

let soundEnabled = $state(loadBoolean(SOUND_ENABLED_KEY, true));
let soundVolume = $state(loadFloat(SOUND_VOLUME_KEY, 0.4));

// 読み込みヘルパー
function loadBoolean(key: string, fallback: boolean): boolean { ... }
function loadFloat(key: string, fallback: number): number { ... }

// setter（localStorage 同期）
function setSoundEnabled(v: boolean): void { ... }
function setSoundVolume(v: number): void { ... }

export const soundStore = { get soundEnabled, get soundVolume, setSoundEnabled, setSoundVolume };
```

デフォルト `soundEnabled: true`（L1 ux_design_vision.md §5-2 準拠）。

### Step 2: sfx.ts 作成

`src/lib/utils/sfx.ts` を新規作成:

Web Audio API で短いクリック音を生成する。AudioContext は遅延初期化（初回再生時）。
ブラウザのオートプレイポリシー対応（ユーザ操作ハンドラ内でのみ呼ぶ）。

```typescript
// クリック音の特性: OscillatorNode (sine, 800Hz → 400Hz) + GainNode (decay 60ms)
// 目的: ゲーム的な触感フィードバック（短くシャープ、疲れない）
export function playClick(volume: number): void {
  // AudioContext 遅延初期化
  // OscillatorNode: type='sine', 800Hz → 400Hz (20ms でスイープ)
  // GainNode: 0.3 → 0 (60ms で decay)
  // total duration: ~80ms
}
```

### Step 3: SettingsPanel にサウンド設定追加

`src/lib/components/settings/SettingsPanel.svelte` を読み込み、既存の設定項目の末尾に
サウンドセクションを追加:

```svelte
<!-- サウンド -->
<section>
  <label>
    <input type="checkbox" bind:checked={soundEnabled} onchange={...} />
    クリック効果音
  </label>
  <!-- soundEnabled が true の時のみボリュームスライダー表示 -->
  {#if soundEnabled}
    <input type="range" min="0" max="1" step="0.05" bind:value={volume} oninput={...} />
  {/if}
</section>
```

### Step 4: パレット実行に SE を適用

`src/routes/palette/+page.svelte` の `launchItem` / `executeBuiltinCommand` 呼び出し箇所で
`playClick(soundStore.soundVolume)` を呼ぶ（`soundStore.soundEnabled` チェック後）。

### Step 5: プライマリボタン確定（Setup 完了ボタン）に SE を適用

`src/routes/+page.svelte` の Setup 完了 / ランチャー確定ボタンのクリックハンドラに
`playClick` を追加。

## 受け入れ条件

- [ ] `src/lib/state/sound.svelte.ts` が存在し、soundEnabled / soundVolume を export する
- [ ] `src/lib/utils/sfx.ts` が存在し、playClick が Web Audio API でインライン生成する
- [ ] デフォルト soundEnabled = true（localStorage なし時）
- [ ] SettingsPanel にクリック効果音トグル + ボリュームスライダーが追加されている
- [ ] パレット実行時に SE が呼ばれる（soundEnabled=true 時）
- [ ] soundEnabled=false 時は SE が呼ばれない
- [ ] `pnpm verify` 全通過
