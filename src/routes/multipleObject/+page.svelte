<script lang="ts">
	import { storeClient, browserClient } from '../../trpc/browserClient';

	let welcomeMessage = storeClient.welcomeName.query.$multiple();
</script>

Multiple store
