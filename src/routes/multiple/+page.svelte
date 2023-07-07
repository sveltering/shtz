<script lang="ts">
	import { storeClient, browserClient } from '../../trpc/browserClient';

	let welcomeMessage = storeClient.welcomeName.query.$multiple(function (input) {
		return 'hi';
	});

	welcomeMessage;
</script>

Multiple store
