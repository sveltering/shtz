<script lang="ts">
	import { onDestroy, onMount } from 'svelte';

	export let from: number | string;
	export let hide0: boolean = false;

	let current = +from;
	let hide = false;

	let intervalTimer: number;
	onMount(() => {
		intervalTimer = setInterval(() => {
			if (current <= 0) {
				hide = hide0 ? true : false;
				clearInterval(intervalTimer);
				return;
			}
			current = current - 1;
		}, 1000) as unknown as number;
	});
	onDestroy(() => {
		if (intervalTimer) {
			clearInterval(intervalTimer);
		}
	});
</script>

{#if !hide}
	{current}
{/if}
