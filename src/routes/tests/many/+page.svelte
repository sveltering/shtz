<script>
	import LoadingDots from '$component/loading-dots.svelte';
	import { storeClient } from '$trpc/browserClient';

	var shouldError = Math.random() < 0.5;

	const many = storeClient.tests.addToList.mutate.$many();

	$many.call({
		item: 'Test ' + (shouldError ? 'error' : ''),
		qty: 20
	});

	console.clear();
	$: console.log($many);
</script>

{#if shouldError}
	TEST: Endpoint should error (keep refreshing for success response)
{:else}
	TEST: Endpoint should return data successfully (keep refreshing for error response)
{/if}
<br />
{#if $many.loading}
	Loading <LoadingDots />
{:else if $many.success}
	{@const item = $many.data}
	date: {item.date}<br />
	item: {item.item}<br /><br /><br /><br />
{:else if $many.error}
	{$many.error.message}
{:else}
	Store is stagnant
{/if}
