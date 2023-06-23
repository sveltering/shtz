import { t } from '../init';
import user from './user';
export default t.router({
	user,
	hello: t.procedure.query(function ({ ctx }) {
		return ctx.welcome;
	})
});
