<script>
	import LoadingDots from '$component/loading-dots.svelte';
	import { storeClient } from '$trpc/browserClient';

	var shouldError = Math.random() < 0.5;

	const update = storeClient.tests.addToList.mutate.$update();

	$update.call({
		item: 'Test ' + (shouldError ? 'error' : ''),
		qty: 20
	});

	console.clear();
	$: console.log($update);
</script>

{#if shouldError}
	TEST: Endpoint should error (keep refreshing for success response)
{:else}
	TEST: Endpoint should return data successfully (keep refreshing for error response)
{/if}
<br />
{#if $update.loading}
	Loading <LoadingDots />
{:else if $update.success}
	{@const item = $update.data}
	date: {item.date}<br />
	item: {item.item}<br /><br /><br /><br />
{:else if $update.error}
	{$update.error.message}
{:else}
	Store is stagnant
{/if}
