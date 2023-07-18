<script lang="ts">
	import LoadingDots from '$component/loading-dots.svelte';
	import { storeClient } from '$trpc/browserClient';
	import type { PageData } from './$types';

	export let data: PageData;

	const update = storeClient.tests.addToList.mutate.$update({
		prefill: data
	});

	console.clear();
	// $: console.log($update);
</script>

TEST: Page data should already fill store<br />
{#if $update.loading}
	Loading <LoadingDots />
{:else if $update.success}
	{@const item = $update.data}
	date: {item.date}<br />
	item: {item.item}<br /><br /><br /><br />
{:else if $update.error}
	{$update.error.message}
{:else}
	Store is stagnant
{/if}
