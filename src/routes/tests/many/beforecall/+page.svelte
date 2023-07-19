<script>
	import Countdown from '$component/countdown.svelte';
	import LoadingDots from '$component/loading-dots.svelte';
	import { storeClient } from '$trpc/browserClient';

	// console.clear();
	let callAllowed = Math.random() < 0.5;

	const many = storeClient.tests.addToList.mutate.$many({
		beforeCall: function (input, replace) {
			if (!callAllowed) {
				throw new Error('call not allowed');
			}
			replace({
				...input,
				item: 'New Value'
			});
		}
	});

	function makeCall() {
		callAllowed = Math.random() < 0.5;
		$many.call({
			item: 'Test',
			qty: 20
		});
	}
	makeCall();

	// $: console.log($update);

	$: callSuccess = callAllowed;
</script>

{#if callSuccess}
	TEST: <br />
	Endpoint call will be successfull and input item property will be replaced with "New Value" changing
	response value
{:else}
	TEST: <br />
	Endpoint call will be blocked an error
{/if}<br />

{#if $many.loading}
	Loading <LoadingDots /><br />
{:else if $many.success}
	{@const item = $many.data}
	date: {item.date}<br />
	item: {item.item}<br />
	<button on:click={makeCall}>Call again</button>
	<br /><br /><br />
{:else if $many.error}
	Error: {$many.error.message}<br />
	<button on:click={makeCall}>Call again</button>
{:else}
	Store is stagnant<br />
	<button on:click={makeCall}>Call again</button>
{/if}
