import type { Router } from './hooks.js';
import { loadClientCreate } from '$lib/browser-clients';

export const loadClient = loadClientCreate<Router>({
	url: 'http://localhost:5173/trpc'
});
