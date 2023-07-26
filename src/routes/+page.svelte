<script lang="ts">
	import { browserClient, type ProcedureReturnType } from "$trpc/browserClient";

	let welcome: ProcedureReturnType<typeof browserClient.welcome.query>;
	(async function () {
		welcome = await browserClient.welcome.query();
	})();
</script>

{#if welcome}
	{welcome}
{:else}
	<h1>Welcome to SvelteKit</h1>
{/if}
<p>
	Visit <a href="https://kit.svelte.dev">kit.svelte.dev</a> to read the documentation
</p>
