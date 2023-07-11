<script lang="ts">
	import { storeClient } from '$trpc/browserClient';

	let welcome = storeClient.welcome.query.$revisable();

	setTimeout(function () {
		$welcome.call('Yusaf');
	}, 1000);
	setTimeout(function () {
		$welcome.call('Error Name');
	}, 3000);
	setTimeout(function () {
		$welcome.call('Derrick');
	}, 5000);
</script>

{#if $welcome.loading}
	Loading...
{:else if $welcome.error}
	{$welcome.error.message}
{:else if $welcome.success}
	{$welcome.data}
{/if}
