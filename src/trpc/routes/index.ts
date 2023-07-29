import { t } from "$trpc/init";
import tests from "./tests";
import db from "./db";
import friends from "./friends";

export default t.router({
	db,
	tests,
	friends,
	welcome: t.procedure.query(function ({ ctx }) {
		return "wellllcomme";
	}),
});
