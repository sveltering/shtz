<script lang="ts">
	import { storeClient, browserClient } from '../../trpc/browserClient';

	let welcomeMessage = storeClient.welcomeName.query.$revisable();

	$welcomeMessage.call({ name: 'Yusaf One' });
	setTimeout(function () {
		$welcomeMessage.call({ name: 'Yusaf Two' });
	}, 3000);
</script>

Many store

{#if $welcomeMessage?.loading}
	Loading...
{:else if $welcomeMessage.success}
	{$welcomeMessage.data}
{/if}
