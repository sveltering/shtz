<script lang="ts">
	import { storeClient } from '$trpc/browserClient';

	let prefill = storeClient.prefillList.query.$format({
		prefill: [
			{ date: 'date', item: '' },
			{ date: 'date', item: '' }
		],
		entry: function (item) {
			// return { first: 1, string: 1, loading: true };
			return { done: 'done', loaded: true };
		}
	});

	let list = storeClient.addToList.mutate.$entry({
		prefill: $prefill.data,
		entry: function (item) {
			return { first: 1, string: 1, loading: true };
		},
		entrySuccess: function (item) {
			return { done: 'done', loaded: true };
		}
	});
</script>
