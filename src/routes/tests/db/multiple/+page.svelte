<script lang="ts">
	import type { PageData } from "./$types";
	import { storeClient } from "$trpc/browserClient";

	export let data: PageData;

	let list = storeClient.db.addToList.mutate.$multiple({
		loading: true,
		prefill: data.prefill,
		unique(input, data) {
			return input ? input : data;
		},
	});

	let itemInput: HTMLInputElement;
	function addItem() {
		$list.call(itemInput.value);
		itemInput.value = "";
	}
</script>

{#if $list.loading}
	<span style="font-weight:bold;font-size:1.2rem">Loading items... </span><br />
{/if}

{#each $list.responses as response}
	{#if response.loading}
		Adding item...
	{:else if response.success}
		{response.data}
	{:else if response.error}
		{response.error.message}
	{/if}
	<br />
{/each}

<form on:submit|preventDefault={addItem}>
	<input placeholder="Item" bind:this={itemInput} />
</form>
