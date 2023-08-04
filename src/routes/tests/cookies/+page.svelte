<script>
	// @ts-nocheck

	import { browserClient } from "$trpc/browserClient";
</script>

cookies
<button on:click={browserClient.cookieAdd.query}>Add cookies</button>
<button on:click={browserClient.cookieDelete.query}>Delete cookie</button>
