<script lang="ts">
import { Button } from '$lib/components/ui/button';

let count = $state(0);
</script>

<div class="flex min-h-screen items-center justify-center">
	<div class="text-center space-y-4">
		<h1 class="text-4xl font-bold">Arcagate</h1>
		<p class="text-muted-foreground">Personal Control Panel</p>
		<Button onclick={() => count++}>
			Count: {count}
		</Button>
	</div>
</div>
