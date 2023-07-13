<script lang="ts">
	import { onDestroy, onMount } from 'svelte';

	export let from: number;

	let current = from;

	let intervalTimer: number;
	onMount(() => {
		intervalTimer = setInterval(() => {
			if (current <= 0) {
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

{current}
