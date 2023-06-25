<script lang="ts">
	import { storeClient } from '../trpc/browserClient';

	let welcomeMessage = storeClient.welcomeMessage.query();
</script>

{$welcomeMessage?.response ?? $welcomeMessage?.message ?? 'Loading...'}
