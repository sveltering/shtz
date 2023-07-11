<script lang="ts">
	import { browserClient, type EndpointReturnType } from '$trpc/browserClient';

	let welcome: EndpointReturnType<typeof browserClient.welcome.query>;
	(async function () {
		welcome = await browserClient.welcome.query('Yusaf');
		// compare log in browser vs terminal. Terminal should be undefined as no endpoint is actually called in the back end.
		console.log(welcome);
	})();
</script>

{welcome ? welcome : ''}
