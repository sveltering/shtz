import type { Router } from './hook.js';
import { browserClientCreate } from '$lib/clients';

export const browserClient = browserClientCreate<Router>({
	url: 'http://localhost:5173/trpc'
});
