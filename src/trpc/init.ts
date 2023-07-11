import { TRPC } from '@sveltering/trpc/server';

export const t = new TRPC({
	path: '/trpc',
	context: function (event) {
		return {
			welcome: 'Hello and welcome!',
			isSignedIn: event?.locals.hasOwnProperty('user')
		};
	}
});

// export const t = new TRPC({
// 	origin: 'http://localhost:5173',
// 	path: '/trpc',
// 	context: function (event) {
// 		return {
// 			welcome: 'Hello and welcome!',
// 			signedIn: event.locals.hasOwnProperty('user')
// 		};
// 	}
// });

// export const signedInProcedure = t.procedure.use(
// 	t.middleware(function ({ ctx, next }) {
// 		if (!ctx?.signedIn) {
// 			throw t.error('User must be signed in to use this route.', 'UNAUTHORIZED');
// 		}
// 		return next({ ctx });
// 	})
// );
