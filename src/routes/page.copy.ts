import type { PageLoad } from './$types';
import { client } from '../trpc/browserClient';

export const load = (async (event) => {
	const data = await client.click.query();

	return { data };
}) satisfies PageLoad;
