<script lang="ts">
	import { storeClient } from '$trpc/browserClient';

	let welcome = storeClient.welcome.query.$once('Yusaf error');
</script>

{#if $welcome.loading}
	Loading...
{:else if $welcome.error}
	{$welcome.error.message}
{:else if $welcome.success}
	{$welcome.data}
{/if}
