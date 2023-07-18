<script>
	import Countdown from '$component/countdown.svelte';
	import LoadingDots from '$component/loading-dots.svelte';
	import { storeClient } from '$trpc/browserClient';

	let shouldError = Math.random() < 0.5;

	const update = storeClient.tests.addToList.mutate.$update({
		remove: true
	});

	$update.call({
		item: 'Test ' + (shouldError ? 'error' : ''),
		qty: 20
	});

	let message = 'The store should be stagnant after 5 seconds';
	setTimeout(function () {
		$update.remove();
	}, 5000);
	setTimeout(function () {
		message = 'The store should now be successfull after another call';
		$update.call({
			item: 'Test Again ! ',
			qty: 20,
			time: 3
		});
	}, 7000);

	console.clear();
	$: console.log($update);
</script>

{#if shouldError}
	TEST: <br />
	Endpoint should error (keep refreshing for success response)
{:else}
	TEST: <br />
	Endpoint should return data successfully (keep refreshing for error response)
{/if}<br />
{message}
<Countdown from={5} hide0={true} />
<br />
{#if $update.loading}
	Loading <LoadingDots />
{:else if $update.success}
	{@const item = $update.data}
	date: {item.date}<br />
	item: {item.item}<br /><br /><br /><br />
{:else if $update.error}
	{$update.error.message}
{:else}
	Store is stagnant
{/if}
