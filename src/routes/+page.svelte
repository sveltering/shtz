<script lang="ts">
	import { browser } from '$app/environment';
	import { writable } from 'svelte/store';
	import { storeClient } from '../trpc/browserClient';

	let welcomeMessage = storeClient.welcomeMessage.query();
</script>

{$welcomeMessage.response}
