<script lang="ts">
	import { storeClient } from '$trpc/browserClient';
	import { get, writable } from 'svelte/store';

	let list = storeClient.addToList.mutate.$entry({
		entry: function (item) {
			return { first: 1, string: 1 };
		},
		entryAfter: function (item) {
			return { after: 1, string: 1 };
		},
		types: {
			entry: null as any as { poop: 'dascoop' }
		}
	});

	if ($list.responses[0].success) {
		const test = $list.responses[0].data;
		// $list.responses[0].data;
	}
</script>
