<script lang="ts">
	import { storeClient } from '$trpc/browserClient';
	import { get, writable } from 'svelte/store';

	let list = storeClient.addToList.mutate.$object({
		key: function (item) {
			return item.date;
		},
		types: {
			data: null as any as { poop: 'dascoop' }
		}
	});
	if ($list.responses.key.error) {
		const test = $list.responses.key.data;
	}
	if ($list.responses.key.loading) {
		const test = $list.responses.key.data;
		// $list.responses[0].data;
	}

	if ($list.responses.key.success) {
		const test = $list.responses.key.data;
	}
</script>
