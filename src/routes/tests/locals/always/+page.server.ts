import type { PageServerLoad } from './$types';

export const load = (async (event) => {
	return {
		message: event.locals.TRPC.welcome('ALWAYS')
	};
}) satisfies PageServerLoad;
