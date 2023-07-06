import { t } from '../init';
import user from './user';
export default t.router({
	user,
	welcomeMessage: t.procedure.query(async function ({ ctx }) {
		return ctx?.welcome;
	}),
	add: t.procedure.mutation(async function ({ ctx }) {
		return 100;
	}),
	mutate: t.router({
		hi: t.procedure.mutation(async function ({ ctx }) {
			return 100;
		}),
		hello: t.router({
			two: t.procedure.mutation(async function ({ ctx }) {
				return 100;
			})
		})
	}),
	subscribe: t.router({
		hi: t.procedure.subscription(async function ({ ctx }) {
			return 100;
		})
	})
});

function sleep(ms: number) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}
