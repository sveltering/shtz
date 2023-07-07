<script lang="ts">
	import { storeClient, storeClient2, browserClient } from '../../trpc/browserClient';

	let help = storeClient2.welcomeName;

	let welcomeMessage = storeClient.welcomeName.query.$multiple(function (input) {
		return input;
	});
</script>

Multiple store
