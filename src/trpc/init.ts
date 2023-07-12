import { TRPC } from '@sveltering/trpc/server';

export const t = new TRPC({
	origin: 'http://localhost:5001',
	bypassOrigin: 'http://localhost:5001',
	path: '/trpc',
	context(event) {
		return {
			welcome: 'Hello and welcome!',
			isSignedIn: event?.locals.hasOwnProperty('user')
		};
	}
});
