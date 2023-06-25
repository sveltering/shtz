import type { Router } from './hooks.js';
import { browserClientCreate } from '$lib/browser';
import { storeClientCreate } from '$lib/browser';

export const browserClient = browserClientCreate<Router>({
	url: 'http://localhost:5173/trpc'
});

export const storeClient = storeClientCreate<Router>({
	url: 'http://localhost:5173/trpc'
});
