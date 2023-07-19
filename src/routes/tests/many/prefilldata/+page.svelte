<script lang="ts">
	import LoadingDots from '$component/loading-dots.svelte';
	import { storeClient } from '$trpc/browserClient';
	import type { PageData } from './$types';

	export let data: PageData;

	const many = storeClient.tests.addToList.mutate.$many({
		prefill: data
	});

	console.clear();
	// $: console.log($update);
</script>

TEST: Page data should already fill store<br />
{#if $many.loading}
	Loading <LoadingDots />
{:else if $many.success}
	{@const item = $many.data}
	date: {item.date}<br />
	item: {item.item}<br /><br /><br /><br />
{:else if $many.error}
	{$many.error.message}
{:else}
	Store is stagnant
{/if}
