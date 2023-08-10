<script>
	import LoadingDots from "$component/loading-dots.svelte";
	import { storeClient } from "$trpc/browserClient";

	var shouldError = Math.random() < 0.5;

	const many = storeClient.tests.addToList.mutate.$many({
		methods: {
			test: function (response, actions) {
				console.log(response);
				if (response.success) {
					response.data.date = "POOOOOP";
					actions.update();
				}
			},
			remoove: function (response, actions) {
				actions.remove();
			},
		},
	});

	let test = $many.call({
		item: "Test " + (shouldError ? "error" : ""),
		qty: 20,
	});

	$: console.log($many);
</script>

{#if shouldError}
	TEST: Endpoint should error (keep refreshing for success response)
{:else}
	TEST: Endpoint should return data successfully (keep refreshing for error
	response)
{/if}
<br />
{#if $many.loading}
	Loading <LoadingDots />
{:else if $many.success}
	{@const item = $many.data}
	date: {item.date}<br />
	item: {item.item}<br />
	<button on:click={$many.test}>Test</button>
	<button on:click={$many.remoove}>Remoove</button>
	<br /><br /><br />
{:else if $many.error}
	{$many.error.message}
{:else}
	Store is stagnant
{/if}
