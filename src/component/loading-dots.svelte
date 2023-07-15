<script lang="ts">
	import { onDestroy, onMount } from 'svelte';

	export let maxDots: number = 4;
	export let hidden: boolean = false;

	let spans: HTMLSpanElement[] = Array(maxDots);

	let styleWord: 'display' | 'visibility' = hidden ? 'display' : 'visibility';
	let hiddenWord: 'none' | 'hidden' = hidden ? 'none' : 'hidden';

	let count = 0;
	let intervalTimer: number;
	onMount(() => {
		intervalTimer = setInterval(() => {
			for (let i = 0; i < maxDots; i++) {
				spans[i].style[styleWord] = i <= count ? 'unset' : hiddenWord;
			}
			count++;
			if (count === maxDots) {
				count = 0;
			}
		}, 250) as unknown as number;
	});
	onDestroy(() => {
		if (intervalTimer) {
			clearInterval(intervalTimer);
		}
	});
</script>

{#each spans as span, i}
	<span bind:this={spans[i]}>.</span>
{/each}
