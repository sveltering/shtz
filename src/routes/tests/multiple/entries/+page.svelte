<script lang="ts">
	import { storeClient } from '$trpc/browserClient';
	import { get, writable } from 'svelte/store';

	let list = storeClient.addToList.mutate.$entry(function (item) {
		return [{ random: 1, string: 'string' }, item];
	});

	if ($list) {
		// $list.
		// $list.responses[0].data;
	}
</script>
