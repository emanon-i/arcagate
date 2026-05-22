<script lang="ts">
/**
 * Stats widget は pure frequency 降順固定で sort_field を持たない (stats.md 参照)。
 * 共通 CommonMaxItemsSettings の並び順 select を出すと「効かない設定」になるため
 * showSort={false} で max_items のみ表示する。
 */
import CommonMaxItemsSettings from '../_shared/CommonMaxItemsSettings.svelte';

// config 型は CommonMaxItemsSettings と一致させる (bind:config の型不変条件)。
// stats は sort_field を使わないが、 型整合のため shape を揃える。
let { config = $bindable() }: { config: { max_items?: number; sort_field?: 'default' | 'name' } } =
	$props();
</script>

<CommonMaxItemsSettings bind:config showSort={false} />
