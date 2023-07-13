import type { PageServerLoad } from './$types';
import { serverClient } from '$trpc/serverClient';
export const load = (async (event) => {
	const TRPC = await serverClient(event);
	return {
		message: TRPC.welcome('SERVER CLIENT')
	};
}) satisfies PageServerLoad;
