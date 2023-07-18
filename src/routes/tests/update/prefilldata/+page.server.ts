import { loadClient } from '$trpc/browserClient';
import type { PageServerLoad } from './$types';

export const load = (async (event) => {
	return loadClient(event).tests.getItem.query();
}) satisfies PageServerLoad;
