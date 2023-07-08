<script lang="ts">
	import { storeClient } from '../../trpc/browserClient';

	let welcomeMessage = storeClient.welcomeName.query.$multiple(function (input) {
		return input.name;
	});

	setTimeout(() => {
		$welcomeMessage.call({ name: 'Yusaf 1' });
	}, 1000);
	setTimeout(() => {
		$welcomeMessage.call({ name: 'Yusaf 2' });
	}, 2000);
	setTimeout(() => {
		$welcomeMessage.call({ name: 'Yusaf 3' });
	}, 3000);
</script>

Multiple store<br />
{#if $welcomeMessage.loading}
	All Names Loading...<br />
{/if}
{#each Object.entries($welcomeMessage.responses) as [key, response]}
	{#if response.loading}
		Loading Name ({key}) ...
	{:else if response.success}
		{response.response}
	{/if}
	<br />
{/each}
