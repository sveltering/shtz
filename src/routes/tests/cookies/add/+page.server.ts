import { serverClient } from "$trpc/serverClient";
import type { PageServerLoad } from "./$types";

export const load = (async (event) => {
	let client = await serverClient(event);
	await client.cookieAdd();
	return {};
}) satisfies PageServerLoad;
