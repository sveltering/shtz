<script>
	import LoadingDots from '$component/loading-dots.svelte';
	import { storeClient } from '$trpc/browserClient';

	var shouldError = Math.random() < 0.5;

	const update = storeClient.tests.addToList.mutate.$update({
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
	$: console.log($update);
</script>

TEST: Data should already fill store<br />
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
