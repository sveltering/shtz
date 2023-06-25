import type { Router } from './hooks.js';
import { storeClientCreate } from '$lib/browser';

export const storeClient = storeClientCreate<Router>({
	url: 'http://localhost:5173/trpc'
});
