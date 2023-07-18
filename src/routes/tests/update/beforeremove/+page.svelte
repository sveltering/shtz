<script>
	import Countdown from '$component/countdown.svelte';
	import LoadingDots from '$component/loading-dots.svelte';
	import { storeClient } from '$trpc/browserClient';

	console.clear();

	let removeBanned = Math.random() < 0.5;
	const update = storeClient.tests.addToList.mutate.$update({
		remove: true,
		beforeRemoveInput: function (input) {
			if (removeBanned) {
				return false;
			}
		}
	});

	function makeCall() {
		removeBanned = Math.random() < 0.5;
		$update.call({
			item: 'Test',
			qty: 20,
			time: 5
		});
	}
	makeCall();

	$: console.log($update);

	$: removeBanned = removeBanned;
</script>

{#if removeBanned}
	TEST: <br />
	Remove will not work (but should work once loaded)
{:else}
	TEST: <br />
	Remove should work
{/if}<br />
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
