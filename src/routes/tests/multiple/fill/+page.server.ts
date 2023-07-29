import { serverClient } from '$trpc/serverClient';
import type { PageServerLoad } from './$types';

export const load = (async (event) => {
	return { prefill: (await serverClient(event)).tests.getList() };
}) satisfies PageServerLoad;
