<script lang="ts">
	import { storeClient } from '../trpc/browserClient';

	let welcomeMessage = storeClient.welcomeMessage.query();
</script>

{#if $welcomeMessage.success}
	{$welcomeMessage.response}
{/if}
