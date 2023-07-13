import type { PageServerLoad } from './$types';

export const load = (async (event) => {
	const TRPC = await event.locals.TRPC();
	return {
		message: TRPC.welcome('CALLABLE')
	};
}) satisfies PageServerLoad;
