<script>
	import Countdown from '$component/countdown.svelte';
	import LoadingDots from '$component/loading-dots.svelte';
	import { storeClient } from '$trpc/browserClient';

	const many = storeClient.tests.addToList.mutate.$many({
		remove: true,
		abort: true
	});

	function makeCall() {
		$many.call({
			item: 'Test ',
			qty: 20,
			time: 5
		});
	}
	makeCall();

	console.clear();
	$: console.log($many);
</script>

TEST: <br />
{#if !$many.aborted}
	Endpoint should return data successfully <Countdown from={5} hide0={true} /><br />
{/if}
{#if $many.loading}
	Loading <LoadingDots /><br />
	<button on:click={$many.abort}>Abort Call</button>
{:else if $many.aborted}
	Call aborted
	<button on:click={makeCall}>Call Again</button>
{:else if $many.success}
	{@const item = $many.data}
	date: {item.date}<br />
	item: {item.item}<br /><br /><br /><br />
{:else if $many.error}
	{$many.error.message}
{:else}
	Store is stagnant
{/if}
