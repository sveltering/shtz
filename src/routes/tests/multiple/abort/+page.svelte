<script>
	import LoadingDots from '$component/loading-dots.svelte';
	import { storeClient } from '$trpc/browserClient';

	let callAllowed = Math.random() < 0.5;

	const generateKey = () => Math.random().toString(36).substring(2, 12);

	const multiple = storeClient.tests.addToList.mutate.$multiple({
		loading: true,
		entry: function (input) {
			return input.item;
		},
		beforeCall: function (input, replace) {
			if (!callAllowed) {
				throw new Error('call not allowed');
			}
			replace({
				...input,
				item: 'New Value ' + generateKey()
			});
		}
	});
	function makeCall() {
		callAllowed = Math.random() < 0.5;
		$multiple.call({
			item: 'Test',
			qty: 20
		});
	}
	makeCall();

	// $: console.log($update);

	$: callSuccess = callAllowed;
</script>

{#if callSuccess}
	TEST: call should be allowed and input will be change to a new value
{:else}
	TEST: call should be blocked
{/if}
<br />
<button on:click={makeCall}>Add random item</button><br />
{#if $multiple.loading}
	List item loading <LoadingDots /><br /><br />
{/if}
{#if $multiple.error}
	{$multiple.error.message}
{:else if $multiple.responses.length}
	{#each $multiple.responses as response}
		{#if response.loading}
			adding item <LoadingDots />
		{:else if response.success}
			{@const item = response.data}
			date: {item.date}<br />
			item: {item.item}<br />
		{:else}
			Error adding item<br />
		{/if}
		<br />
	{/each}
{:else if !$multiple.responses.length}
	No items added yet
{:else}
	Store is stagnant
{/if}
