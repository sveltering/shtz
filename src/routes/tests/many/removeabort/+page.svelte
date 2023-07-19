<script>
	import Countdown from '$component/countdown.svelte';
	import LoadingDots from '$component/loading-dots.svelte';
	import { storeClient } from '$trpc/browserClient';

	const many = storeClient.tests.addToList.mutate.$many({
		abortOnRemove: true
	});

	function makeCall() {
		$many.call({
			item: 'Test ',
			qty: 20,
			time: 7
		});
	}
	makeCall();

	console.clear();
	$: console.log($many);
</script>

TEST: <br />
Request should abort when removed(check in console network tab)
<br />
{#if $many.loading}
	Loading <LoadingDots /><br />
	<button on:click={$many.remove}>Remove</button>
{:else if $many.success}
	{@const item = $many.data}
	date: {item.date}<br />
	item: {item.item}<br />
	<button on:click={$many.remove}>Remove</button>
	<br /><br /><br />
{:else if $many.error}
	{$many.error.message}
{:else}
	Store is stagnant<br />
	<button on:click={makeCall}>Call again</button>
{/if}
