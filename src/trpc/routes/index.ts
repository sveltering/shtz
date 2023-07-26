import { t } from "$trpc/init";
import tests from "./tests";
export default t.router({
	tests,
	welcome: t.procedure.query(function ({ ctx }) {
		return "wellllcomme";
	}),
});
