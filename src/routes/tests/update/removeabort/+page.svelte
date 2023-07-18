<script>
	import Countdown from '$component/countdown.svelte';
	import LoadingDots from '$component/loading-dots.svelte';
	import { storeClient } from '$trpc/browserClient';

	const update = storeClient.tests.addToList.mutate.$update({
		abortOnRemove: true
	});

	function makeCall() {
		$update.call({
			item: 'Test ',
			qty: 20,
			time: 5
		});
	}
	makeCall();

	console.clear();
	$: console.log($update);
</script>

TEST: <br />
Request should abort when removed(check in console network tab)
<br />
{#if $update.loading}
	Loading <LoadingDots /><br />
	<button on:click={$update.remove}>Remove</button>
{:else if $update.success}
	{@const item = $update.data}
	date: {item.date}<br />
	item: {item.item}<br />
	<button on:click={$update.remove}>Remove</button>
	<br /><br /><br />
{:else if $update.error}
	{$update.error.message}
{:else}
	Store is stagnant<br />
	<button on:click={makeCall}>Call again</button>
{/if}
