<script lang="ts">
	import { writable } from 'svelte/store';

	console.clear();
	let hi = {
		hi: 1
	};

	let store = writable(hi);

	$: console.log(hi);

	setTimeout(() => {
		hi.hello = 'HELLO';
		store.update((val) => val);
	}, 3000);
</script>
