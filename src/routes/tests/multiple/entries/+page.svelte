<script lang="ts">
	import { storeClient } from '$trpc/browserClient';

	let list = storeClient.addToList.mutate.$array({}, null as any as { hello?: string });

	if ($list) {
		$list.responses[0].data;
	}
</script>
