<script lang="ts">
	// 30
	import { storeClient } from '$trpc/browserClient';

	let prefill = storeClient.prefillList.query.$once();

	let list = storeClient.addToList.mutate.$entry({
		prefill: storeClient.prefillList.query.call,
		entry: function (input) {
			return { first: 1, string: 1, loading: true };
		},
		entrySuccess: function (item) {
			return { done: 'done', loaded: true };
		},
		types: {
			// ENTRY
			// orEntry: null as any as { testEntry?: string }
			// andEntry: null as any as { testEntry?: string },
			//
			// ENTRY SUCCESS
			// orEntrySuccess: null as any as { testEntrySuccess?: string }
			// andEntrySuccess: null as any as { testEntrySuccess?: string },
			//
			// DATA
			// orData: null as any as { testData?: string }
			// andData: null as any as { testData?: string },
		}
	});

	$list.DEBUG;

	if ($list.responses[0].loading) {
		const entry = $list.responses[0].entry;
		if ('testEntry' in entry) {
			entry;
		}
		const data = $list.responses[0].data;
	}

	if ($list.responses[0].success) {
		const entry = $list.responses[0].entry;
		const data = $list.responses[0].data;
	}
</script>
