import { TRPC } from '$lib';

let t = new TRPC({
	origin: 'http://localhost:5173',
	path: '/trpc',
	bypassOrigin: 'http://localhost:5173',
	context: async function (event) {
		return {
			session: 'Random String'
		};
	}
});

const router = t.router({
	click: t.procedure.query(async function ({ ctx }) {
		return 'Click!';
	})
});

export type Router = typeof router;
export const TRPCHook = t.hook(router);
export const TRPCHandlefetch = t.handleFetch();
