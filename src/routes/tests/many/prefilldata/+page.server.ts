import { serverClient } from '$trpc/serverClient';
import type { PageServerLoad } from './$types';

export const load = (async (event) => {
	return (await serverClient(event)).tests.getItem();
}) satisfies PageServerLoad;
