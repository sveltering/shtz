import type { Router } from './hook.js';
import { browserClientCreate } from '$lib';

export const browserClient = browserClientCreate<Router>({
	url: 'http://localhost:5173/trpc'
});
