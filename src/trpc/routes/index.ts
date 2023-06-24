import { t } from '../init';
import user from './user';
export default t.router({
	user,
	welcomeMessage: t.procedure.query(async function ({ ctx }) {
		await sleep(5000);
		return ctx?.welcome;
	})
});

function sleep(ms: number) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}
