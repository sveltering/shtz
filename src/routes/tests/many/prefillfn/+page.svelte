<script>
	import LoadingDots from '$component/loading-dots.svelte';
	import { storeClient } from '$trpc/browserClient';

	var shouldError = Math.random() < 0.5;

	const many = storeClient.tests.addToList.mutate.$many({
		//working
		// prefill: storeClient.tests.getItem.query.call
		//
		//
		//working
		// prefill: async function () {
		// 	return storeClient.tests.getItem.query.call();
		// }
		//working
		prefill: {
			date: new Date().toLocaleString('en-GB'),
			item: '468e1822-44c2-4021-90f2-34d1e5c57763'
		}
	});

	console.clear();
	$: console.log($many);
</script>

TEST: Data should already fill store<br />
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
