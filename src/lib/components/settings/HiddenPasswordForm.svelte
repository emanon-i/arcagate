<script lang="ts">
import { hiddenStore } from '$lib/state/hidden.svelte';

let password = $state('');
let confirmPassword = $state('');
let mode = $state<'set' | 'verify'>('verify');
let localError = $state<string | null>(null);
let successMessage = $state<string | null>(null);

async function handleSetPassword() {
	localError = null;
	successMessage = null;
	if (password !== confirmPassword) {
		localError = 'パスワードが一致しません';
		return;
	}
	if (password.length === 0) {
		localError = 'パスワードを入力してください';
		return;
	}
	try {
		await hiddenStore.setPassword(password);
		successMessage = 'パスワードを設定しました';
		password = '';
		confirmPassword = '';
	} catch (e) {
		localError = String(e);
	}
}

async function handleVerify() {
	localError = null;
	successMessage = null;
	const success = await hiddenStore.toggle(password);
	if (success) {
		password = '';
	} else {
		localError = hiddenStore.error;
	}
}

function switchMode(newMode: 'set' | 'verify') {
	mode = newMode;
	password = '';
	confirmPassword = '';
	localError = null;
	successMessage = null;
}
</script>

<div class="space-y-4">
  <h3 class="text-sm font-medium">センシティブコンテンツの表示</h3>

  <div class="flex gap-2">
    <button
      type="button"
      class="rounded-md px-3 py-1.5 text-sm {mode === 'verify'
        ? 'bg-primary text-primary-foreground'
        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}"
      onclick={() => switchMode("verify")}
    >
      表示切替
    </button>
    <button
      type="button"
      class="rounded-md px-3 py-1.5 text-sm {mode === 'set'
        ? 'bg-primary text-primary-foreground'
        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}"
      onclick={() => switchMode("set")}
    >
      パスワード設定
    </button>
  </div>

  {#if mode === "verify"}
    <div class="space-y-2">
      <label class="block text-sm text-muted-foreground" for="verify-password">
        パスワード（未設定の場合はそのまま切替可）
      </label>
      <div class="flex gap-2">
        <input
          id="verify-password"
          type="password"
          class="w-48 rounded-md border bg-background px-3 py-2 text-sm"
          bind:value={password}
          placeholder="パスワード"
        />
        <button
          type="button"
          class="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90"
          onclick={handleVerify}
        >
          {hiddenStore.isHiddenVisible ? "隠す" : "表示"}
        </button>
      </div>
    </div>
  {:else}
    <div class="space-y-2">
      <label class="block text-sm text-muted-foreground" for="set-password">
        新しいパスワード
      </label>
      <input
        id="set-password"
        type="password"
        class="w-48 rounded-md border bg-background px-3 py-2 text-sm"
        bind:value={password}
        placeholder="パスワード"
      />
      <label
        class="block text-sm text-muted-foreground"
        for="confirm-password"
      >
        確認
      </label>
      <input
        id="confirm-password"
        type="password"
        class="w-48 rounded-md border bg-background px-3 py-2 text-sm"
        bind:value={confirmPassword}
        placeholder="パスワード（確認）"
      />
      <div>
        <button
          type="button"
          class="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90"
          onclick={handleSetPassword}
        >
          設定する
        </button>
      </div>
    </div>
  {/if}

  {#if localError}
    <p class="text-sm text-destructive">{localError}</p>
  {/if}
  {#if successMessage}
    <p class="text-sm text-green-600">{successMessage}</p>
  {/if}
</div>
