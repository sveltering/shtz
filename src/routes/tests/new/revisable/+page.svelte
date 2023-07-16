<script lang="ts">
	import { storeClient } from '$trpc/browserClient';

	let list = storeClient.addToList.mutate.$revise({
		abortOnRemove: true
	});

	if ($list.loading) {
	}
</script>
