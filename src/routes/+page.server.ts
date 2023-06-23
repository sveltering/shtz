import type { PageServerLoad } from './$types';
import { serverClient } from '../trpc/serverClient';

export const load = (async (event) => {
	let iii = await event.locals.TRPC;
	let client = serverClient(event);
	console.log(await client.hello());
	return {};
}) satisfies PageServerLoad;
