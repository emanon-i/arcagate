<script lang="ts">
import KeyHint from '$lib/components/arcagate/common/KeyHint.svelte';
import { t } from '$lib/i18n.svelte';

/**
 * overlay-palette cleanup (2026-05-13) Palette フッター hint bar 集約。
 *
 * 旧 chips variant (`:dev` / `=` / `>`) は撤去:
 *   - `:dev` (#2): 機能無し、 実際は tag prefix の delimiter で hint 誤誘導
 *   - `>` (#4): 内蔵コマンド機能無し、 hint 削除
 *   - `=` (#3): 実装あり、 bar variant に移動
 *
 * bar variant に整理 (#5 #6): 機能ある hint のみ残す:
 *   - ↑↓ 移動 (実装あり)
 *   - Tab 詳細 (実装あり、 tab-complete)
 *   - = で電卓 (実装あり、 # 3 で chip → bar 移動)
 *   - Ctrl+H 非表示アイテム表示 (#5 で bar 移動、 実装無し hint は撤去対象だが user 指示で「下部に残す」)
 *
 * 撤去 (#6 = 不要 action 整理):
 *   - Ctrl+K アクション (実装無し、 user 8 点に明示無しだが本 cleanup で撤去)
 */
</script>

<div class="flex flex-wrap items-center gap-2">
	<KeyHint keys="↑ ↓" description={t('palette.keyguide.move')} />
	<KeyHint keys="Tab" description={t('palette.keyguide.detail')} />
	<KeyHint keys="=" description={t('palette.keyguide.calculator')} />
	<KeyHint keys="Ctrl+H" description={t('palette.keyguide.hidden_items')} />
</div>
