<script lang="ts">
	import { storeClient, browserClient } from '../../trpc/browserClient';

	let welcomeMessage = storeClient.welcomeName.query.$many();

	$welcomeMessage.call({ name: 'Yusaf One' });
	setTimeout(function () {
		$welcomeMessage.call({ name: 'Yusaf Two' });
	}, 3000);
</script>

New store

{#if $welcomeMessage?.success}
	{$welcomeMessage.response}
{/if}
