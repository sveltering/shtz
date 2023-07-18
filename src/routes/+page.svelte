<script lang="ts">
	import { writable } from 'svelte/store';

	let hi = {
		hi: 1
	};
	let store = writable(hi);

	console.log($store);
</script>
