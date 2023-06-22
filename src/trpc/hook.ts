import { TRPC } from '$lib/server';

const t = new TRPC({
	origin: 'http://localhost:5173',
	path: '/trpc',
	bypassOrigin: 'http://localhost:5173',
	context: function (event, pipe) {
		return {
			session: 'Random String'
		};
	},
	beforeResolve(event, pipe) {
		if (!pipe?.date) {
			pipe.date = new Date();
		}
		console.log(pipe.date);
	},
	beforeResponse(event, pipe, result) {
		console.log(pipe.date);
	}
});

const router = t.router({
	click: t.procedure.query(async function () {
		return 'Click!';
	})
});

export type Router = typeof router;
export const TRPCHook = t.hook(router);
export const TRPCHandlefetch = t.handleFetch();
