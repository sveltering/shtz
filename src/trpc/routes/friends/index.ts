import { t } from "$trpc/init";
import * as schema from "./schema.js";
import { sleep } from "$trpc/functions";
export default t.router({
	add: t.procedure.input(schema.add).mutation(async function ({ input }) {
		return await friendsDB.add(input.friend1, input.friend2);
	}),
	getAll: t.procedure.query(async function () {
		return await friendsDB.getAll();
	}),
	remove: t.procedure.input(schema.remove).query(async function ({ input }) {
		return await friendsDB.remove(input.friend1, input.friend2);
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
 * friendsDB
 * The revolutionary database for friendship data storing and modelling
 * Let's pretend it's a real db :)
 */
//@ts-ignore
const friendsDBStore: { [key: string]: { [key: string]: string } } =
	global?.friendsDbStore || {};

const friendsDB = {
	getFriend1Store: function (friend1: string) {
		const friend1Lower = friend1.toLowerCase();
		let friend1Store = friendsDBStore?.[friend1Lower];
		if (!friend1Store) {
			friend1Store = friendsDBStore[friend1Lower] = {};
		}
		return friend1Store;
	},
	_remove: function (friend1: string, friend2: string) {
		const friend2Lower = friend2.toLowerCase();
		let friend1Store = this.getFriend1Store(friend1);
		delete friend1Store[friend2Lower];
	},
	_add: function (friend1: string, friend2: string, date: string) {
		let friend1Store = this.getFriend1Store(friend1);
		const friend2Lower = friend2.toLowerCase();
		friend1Store[friend2Lower] = date;
	},
	add: async function (friend1: string, friend2: string) {
		await sleep(0.3, 1.5);
		this._remove(friend1, friend2);
		const date = new Date().toLocaleString("en-GB");
		this._add(friend1, friend2, date);
		return { friend1, friend2, date };
	},
	remove: async function (friend1: string, friend2: string) {
		await sleep(1.5, 2);
		this._remove(friend1, friend2);
		return true;
	},
	getAll: async function () {
		let all: { friend1: string; friend2: string; date: string }[] = [];
		for (let friend1 in friendsDBStore) {
			const friend2s = friendsDBStore[friend1];
			for (let friend2 in friend2s) {
				all.push({ friend1, friend2, date: friend2s[friend2] });
			}
		}
		return all;
	},
};
