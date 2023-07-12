<script lang="ts">
	import { storeClient } from '$trpc/browserClient';

	let welcome = storeClient.noInput.query.$multiple({
		entry: function (input) {
			return +new Date();
		}
	});
</script>
