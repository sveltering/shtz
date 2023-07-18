<script>
	import Countdown from '$component/countdown.svelte';
	import LoadingDots from '$component/loading-dots.svelte';
	import { storeClient } from '$trpc/browserClient';

	const update = storeClient.tests.addToList.mutate.$update({
		remove: true,
		abort: true
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
{#if !$update.aborted}
	Endpoint should return data successfully <Countdown from={5} hide0={true} /><br />
{/if}
{#if $update.loading}
	Loading <LoadingDots /><br />
	<button on:click={$update.abort}>Abort Call</button>
{:else if $update.aborted}
	Call aborted
	<button on:click={makeCall}>Call Again</button>
{:else if $update.success}
	{@const item = $update.data}
	date: {item.date}<br />
	item: {item.item}<br /><br /><br /><br />
{:else if $update.error}
	{$update.error.message}
{:else}
	Store is stagnant
{/if}
