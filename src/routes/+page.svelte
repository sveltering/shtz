<script lang="ts">
	import { browser } from '$app/environment';
	import { browserClient, type EndpointReturnType } from '../trpc/browserClient';

	let welcomeMessage: EndpointReturnType<typeof browserClient.welcomeMessage.query>;
	(async function () {
		const start = Date.now();
		welcomeMessage = await browserClient.welcomeMessage.query();
		const end = Date.now();
		console.log(`Execution time: ${end - start} ms`);
	})();
</script>

{#if welcomeMessage}
	{welcomeMessage}
{/if}
