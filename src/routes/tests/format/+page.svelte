<script lang="ts">
	import { storeClient } from '$trpc/browserClient';

	let list = storeClient.prefillList.query.$format({
		entry: function (item) {
			return [{ data: item.date }, item];
		}
	});

	if ($list.success) {
		$list.data;
	}
</script>
