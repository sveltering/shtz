import type { Router } from './hooks.js';
import { browserClientCreate } from '$lib/browser';

export const browserClient = browserClientCreate<Router>({
	url: 'http://localhost:5173/trpc'
});
