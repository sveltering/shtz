<script>
	import LoadingDots from '$component/loading-dots.svelte';
	import { storeClient } from '$trpc/browserClient';

	var shouldError = Math.random() < 0.5;

	const once = storeClient.tests.getList.query.$once(shouldError);

	// console.clear();
	// $: console.log($once);
</script>

{#if shouldError}
	TEST: Endpoint should error (keep refreshing for success response)
{:else}
	TEST: Endpoint should return data successfully (keep refreshing for error response)
{/if}
<br />
{#if $once.loading}
	Loading <LoadingDots />
{:else if $once.success}
	{#each $once.data as item}
		date: {item.date}<br />
		item: {item.item}<br /><br /><br /><br />
	{/each}
{:else if $once.error}
	{$once.error.message}
{/if}
