<script lang="ts">
	import { browserClient } from '../trpc/browserClient';

	let welcomeMessage;
	(async function () {
		welcomeMessage = await browserClient.welcomeMessage.query();
	})();
</script>

{welcomeMessage}
