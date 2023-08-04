import { t } from "$trpc/init";
import tests from "./tests";
import db from "./db";
import friends from "./friends";
import { randInt } from "$trpc/functions";

export default t.router({
	db,
	tests,
	friends,
	welcome: t.procedure.query(function ({ ctx }) {
		return "wellllcomme";
	}),
	cookieAdd: t.procedure.query(function ({ ctx }) {
		ctx.cookies.set("test", randInt(1, 10) + "_cookie", {
			path: "/",
			httpOnly: false,
		});
		ctx.cookies.set("test2", randInt(1, 10) + "_cookie", {
			path: "/",
			httpOnly: false,
		});
		ctx.cookies.set("test3", randInt(1, 10) + "_cookie", {
			path: "/",
			httpOnly: false,
		});
	}),
	cookieDelete: t.procedure.query(function ({ ctx }) {
		ctx.cookies.delete("test3");
	}),
});
