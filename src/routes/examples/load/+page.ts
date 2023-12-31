import type { LoadEvent } from '@sveltejs/kit';
import { loadClient } from '$trpc/browserClient';

export const load = async (event: LoadEvent) => {
	return {
		message: await loadClient(event).welcome.query('Yusaf')
	};
};
