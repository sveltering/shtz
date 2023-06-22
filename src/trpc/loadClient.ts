import type { Router } from './hook.js';
import { loadClientCreate } from '$lib';

export const loadClient = loadClientCreate<Router>({
	url: 'http://localhost:5173/trpc'
});
