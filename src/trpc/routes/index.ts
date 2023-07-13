import { t } from '$trpc/init';
import { z } from 'zod';

export default t.router({
	noInput: t.procedure.query(function () {
		return 'No Input';
	}),
	welcome: t.procedure.input(z.string().optional()).query(async function ({ input }) {
		if (strContainsError(input)) {
			throw t.error(`Error welcoming "${input || ''}"`);
		}
		return `Welcome ${input ? `"${input}" hello` : ''}`;
	}),
	fetchTest: t.procedure.input(z.string()).query(async function ({ input }) {
		return `${input} from main server`;
	}),
	//For revisable store example to demonstrate loading states
	welcomeSleep: t.procedure.input(z.string().optional()).query(async function ({ input }) {
		await sleep(2);
		if (strContainsError(input)) {
			throw t.error(`Error welcoming "${input || ''}"`);
		}
		return `Welcome ${input ? `"${input}"` : ''}`;
	}),
	addToList: t.procedure
		.input(z.object({ item: z.string(), time: z.coerce.number() }))
		.mutation(async function ({ input }) {
			await sleep(input.time);
			if (input.item.toLowerCase().indexOf('error') > -1) {
				throw t.error(`Error adding item "${input.item}" to list.`, 'FORBIDDEN');
			}
			return {
				date: new Date().toLocaleString('en-GB'),
				item: input.item
			};
		})
});

function sleep(tMin: number, tMax?: number, inS: boolean = true) {
	tMin = tMin * (inS ? 1000 : 1);
	tMax = tMax ? tMax * (inS ? 1000 : 1) : undefined;
	const s = tMax !== undefined && tMax > tMin ? randInt(tMax, tMin) : tMin;
	return new Promise((resolve) => {
		setTimeout(resolve, s);
	});
}
function randInt(min: number, max: number) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}
function strContainsError(str: string | undefined): boolean {
	return str ? str.toLowerCase().indexOf('error') > -1 : false;
}
