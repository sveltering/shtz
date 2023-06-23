import { t } from '../../init';

export default t.router({
	welcome: t.procedure.query(function ({ ctx }) {
		const { signedIn } = ctx;
		if (signedIn) {
			return `You are signed In!`;
		}
		return `Welcome, please sign in!`;
	})
});
