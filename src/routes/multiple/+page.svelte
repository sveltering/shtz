<script lang="ts">
	import { storeClient, browserClient } from '../../trpc/browserClient';

	let welcomeMessage = storeClient.welcomeName.query.$multiple(function (input) {
		return input.name;
	});
</script>

Multiple store
