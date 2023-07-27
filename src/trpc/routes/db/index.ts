import { sleep } from "$trpc/functions";
import { t } from "$trpc/init";
import { z } from "zod";

export default t.router({
	welcome: t.procedure.query(function ({ ctx }) {
		return ctx.welcome;
	}),
	welcomeName: t.procedure
		.input(z.string().min(3))
		.query(async function ({ input: name }) {
			await sleep(0.5, 2);
			if (name === "error") {
				throw t.error(`${name} is not a valid name`);
			}
			return `Welcome ${name}`;
		}),
	getList: t.procedure.query(async function () {
		return await stringDB.getAll();
	}),
	removeFromList: t.procedure
		.input(z.string())
		.mutation(async function ({ input: item }) {
			try {
				return await stringDB.remove(item);
			} catch (e) {
				throw t.error("Failed to remove item", "INTERNAL_SERVER_ERROR");
			}
		}),
	addToList: t.procedure
		.input(z.string())
		.mutation(async function ({ input: item }) {
			try {
				await stringDB.insert(item);
			} catch (e) {
				throw t.error("Failed to add item", "INTERNAL_SERVER_ERROR");
			}
			return item;
		}),
});
/*
 *
 *
 *
 *
 *
 *
 *
 * STRING DB :)
 * THE NEXT GEN DATABASE TO TAKE OVER THE WORLD!
 */
declare global {
	var stringDBStore: undefined | string[];
}
let stringDBStore: string[] = global?.stringDBStore || [];
let stringDB = {
	data: stringDBStore as string[],
	getAll: async function (): Promise<string[]> {
		await sleep(0.5, 2);
		return this.data;
	},
	remove: async function (removeItem: string) {
		await sleep(0.5, 2);
		if (Math.random() < 0.2) {
			throw new Error("Failed to remove");
		}
		this.data = this.data.filter((item: string) => item !== removeItem);
		global.stringDBStore = this.data;
		return true;
	},
	insert: async function (addItem: string) {
		await sleep(0.5, 2);
		if (Math.random() < 0.1) {
			throw new Error("Failed to insert");
		}
		if (this.data.includes(addItem)) {
			this.data = this.data.filter((item) => item !== addItem);
		}
		this.data.push(addItem);
		global.stringDBStore = this.data;
		return addItem;
	},
};
