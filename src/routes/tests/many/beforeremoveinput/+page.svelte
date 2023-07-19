<script>
	import Countdown from '$component/countdown.svelte';
	import LoadingDots from '$component/loading-dots.svelte';
	import { storeClient } from '$trpc/browserClient';

	console.clear();

	let remove = Math.random() < 0.5;

	$: remove = remove;

	const many = storeClient.tests.addToList.mutate.$many({
		remove: true,
		beforeRemoveInput: function (input) {
			return remove;
		}
	});

	function makeCall() {
		remove = Math.random() < 0.5;
		$many.call({
			item: 'Test',
			qty: 20,
			time: 5
		});
	}
	makeCall();

	// $: console.log($update);
</script>

{#if remove}
	TEST: <br />
	Remove should work
{:else}
	TEST: <br />
	Remove will not work (but should work once loaded)
{/if}<br />
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
