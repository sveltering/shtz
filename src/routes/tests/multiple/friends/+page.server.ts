import { serverClient } from "$trpc/serverClient";
import type { PageServerLoad } from "./$types";

export const load = (async (event) => {
	const client = await serverClient(event);
	return {
		prefill: client.friends.getAll(),
	};
}) satisfies PageServerLoad;
