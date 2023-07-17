<script lang="ts">
	// 30
	import { storeClient } from '$trpc/browserClient';

	// (async function () {
	// 	console.log(await storeClient.prefillList.query.call());
	// })();

	let prefillList = storeClient.prefillList.query.$update();

	// $prefillList.

	let list = storeClient.addToList.mutate.$entry({
		entry: function (item) {
			return { first: 1, string: 1, loading: true };
		}
	});
</script>
