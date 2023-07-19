<script>
	import LoadingDots from '$component/loading-dots.svelte';
	import { storeClient } from '$trpc/browserClient';

	let remove = Math.random() < 0.5;

	$: remove = remove;

	const generateKey = () => Math.random().toString(36).substring(2, 12);

	const multiple = storeClient.tests.addToList.mutate.$multiple({
		loading: true,
		remove: true,
		entry: function (input) {
			return input.item;
		},
		beforeRemoveInput: function (input) {
			return remove;
		}
	});

	function addRandom() {
		remove = Math.random() < 0.5;
		$multiple.call({
			item: 'Test ' + generateKey(),
			qty: 20,
			time: 3
		});
	}

	console.clear();
	// $: console.log($multiple);
</script>

{#if remove}
	TEST: <br />
	Remove should work
{:else}
	TEST: <br />
	Remove will not work (but should work once loaded)
{/if}<br />
<button on:click={addRandom}>Add random item</button><br />
{#if $multiple.loading}
	List item loading <LoadingDots /><br /><br />
{/if}
{#if $multiple.error}
	{$multiple.error.message}
{:else if $multiple.responses.length}
	{#each $multiple.responses as response}
		{#if response.loading}
			adding item <LoadingDots /><button on:click={response.remove}>Remove</button>
		{:else if response.success}
			{@const item = response.data}
			date: {item.date}<br />
			item: {item.item}<button on:click={response.remove}>Remove</button><br /><br />
		{:else}
			Error adding item<button on:click={response.remove}>Remove</button>
		{/if}
		<br />
	{/each}
{:else if !$multiple.responses.length}
	No items added yet
{:else}
	Store is stagnant
{/if}
