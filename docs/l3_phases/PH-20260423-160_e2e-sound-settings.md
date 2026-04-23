---
status: todo
phase_id: PH-20260423-160
scope_files:
  - tests/e2e/settings.spec.ts
parallel_safe: true
depends_on: []
---

# PH-20260423-160 E2E: サウンド設定トグル・ボリュームスライダー テスト追加

## 背景・目的

`SettingsPanel` に batch-32（PH-148）で追加したサウンド設定 UI（ON/OFF トグル・音量スライダー）のテストが存在しない。
`tests/e2e/settings.spec.ts` に 2 ケースを追加して自動品質ゲートでカバーする。

なお Web Audio API（`playClick`）はテスト環境で実際に音を鳴らすことができない。**音が鳴るかどうかは手動確認依頼セクション任せ** とし、E2E では「UI が正しく表示/操作できるか」のみ検証する。

## 実装仕様

### tests/e2e/settings.spec.ts 追加テスト

`設定パネル` describe の末尾に以下を追加:

```typescript
test('サウンド ON/OFF トグルが切り替わること', async ({ page }) => {
  await openSettings(page);

  // サウンドセクションが表示されていること
  const soundSection = page.getByRole('group', { name: 'サウンド' });
  await expect(soundSection).toBeVisible();

  // トグルボタンを取得
  const toggle = soundSection.getByRole('switch');
  const initialChecked = await toggle.getAttribute('aria-checked');

  // トグルをクリック → 状態が反転する
  await toggle.click();
  const newChecked = await toggle.getAttribute('aria-checked');
  expect(newChecked).not.toBe(initialChecked);

  // OFF 時は音量スライダーが非表示
  if (newChecked === 'false') {
    await expect(soundSection.getByRole('slider')).not.toBeVisible();
  } else {
    await expect(soundSection.getByRole('slider')).toBeVisible();
  }
});

test('サウンド ON 時に音量スライダーが表示されること', async ({ page }) => {
  await openSettings(page);

  const soundSection = page.getByRole('group', { name: 'サウンド' });
  const toggle = soundSection.getByRole('switch');

  // ON 状態にする
  const isOn = (await toggle.getAttribute('aria-checked')) === 'true';
  if (!isOn) {
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
  }

  // 音量スライダーが表示されていること
  const slider = soundSection.getByRole('slider');
  await expect(slider).toBeVisible();

  // スライダーの値が 0〜1 の範囲であること
  const val = await slider.getAttribute('value');
  const num = parseFloat(val ?? '0');
  expect(num).toBeGreaterThanOrEqual(0);
  expect(num).toBeLessThanOrEqual(1);
});
```

### SettingsPanel.svelte — `role="group"` 付与確認

サウンドセクションの親 `<div>` に `role="group"` と `aria-labelledby` が必要。
現在の実装を確認し、なければ追加する。

想定パターン:

```svelte
<div role="group" aria-labelledby="sound-section-label">
  <p id="sound-section-label" class="...">サウンド</p>
  ...
</div>
```

## 受け入れ条件

- [ ] `pnpm test:e2e` でサウンド関連テスト 2 件がパス
- [ ] `SettingsPanel.svelte` に `role="group"` + `aria-labelledby` が付与されている（または既存構造で代替）
- [ ] `pnpm verify` 全通過

## 注意事項

- Web Audio API はブラウザ環境依存。Tauri CDP 経由でも実際の音再生テストは不可なため、SE の音質・タイミングは手動確認依頼に委ねる
- `role="switch"` と `aria-checked` は PH-148 で実装済み（`SettingsPanel.svelte`）
- スライダーは `type="range"` → `role="slider"` として Playwright から取得可能
