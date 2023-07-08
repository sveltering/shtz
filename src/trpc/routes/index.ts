import { t } from '../init';
import { z } from 'zod';
import user from './user';
export default t.router({
	user,
	welcomeMessage: t.procedure.query(async function ({ ctx }) {
		return ctx?.welcome;
	}),
	welcomeName: t.procedure
		.input(
			z.object({
				name: z.coerce.string().min(5)
			})
		)
		.query(async function ({ input, ctx }) {
			await sleep(1000);
			if (input.name === 'Yusaf 2') {
				await sleep(5000);
			}
			return `welcome ${input.name}`;
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
function randomInteger(min: number, max: number) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}
