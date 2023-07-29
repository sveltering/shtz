<script lang="ts">
	import { browser } from "$app/environment";
	import LoadingDots from "$component/loading-dots.svelte";
	import { storeClient } from "$trpc/browserClient";

	import type { PageData } from "./$types";

	export let data: PageData;

	const multiple = storeClient.tests.addToList.mutate.$multiple({
		loading: true,
		entry: function (input) {
			return input;
		},
		entrySuccess: function (input) {
			return input;
		},
	});

	if (browser) {
		setTimeout(function () {
			$multiple.fill(data.prefill);
		}, 2000);
	}

	// console.clear();
	// $: console.log($multiple);
</script>

TEST: Data should already fill store<br />
{#if $multiple.loading}
	List item loading <LoadingDots /><br /><br />
{/if}
{#if $multiple.prefillError}
	{$multiple.prefillError.message}
{/if}
{#if $multiple.responses.length}
	{#each $multiple.responses as response, index}
		{#if response.loading}
			{@const entry = response.entry}
			adding item <LoadingDots />
		{:else if response.success}
			{@const item = response.data}
			{@const entry = response.entry}
			date: {item.date}<br />
			item: {item.item}<br />
			<br />
			<br />
		{:else}
			Error adding item
		{/if}
		<br />
	{/each}
{:else if !$multiple.responses.length}
	No items added yet
{:else}
	Store is stagnant
{/if}
