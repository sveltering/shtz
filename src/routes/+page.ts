import type { PageLoad } from './$types';
import { loadClient } from '../trpc/loadClient';
import { browserClient } from '../trpc/browserClient';

export const load = (async (event) => {
	let data;
	try {
		data = browserClient.hello.query();
	} catch (e) {
		data = 'error';
	}

	return { data };
}) satisfies PageLoad;
