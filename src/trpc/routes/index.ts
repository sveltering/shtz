import { t } from "$trpc/init";
import tests from "./tests";
import db from "./db";
export default t.router({
	db,
	tests,
	welcome: t.procedure.query(function ({ ctx }) {
		return "wellllcomme";
	}),
});
