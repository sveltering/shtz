import type { Router } from './hooks.js';
import { browserClientCreate, storeClientCreate } from '$lib/browser';

export const storeClient = storeClientCreate<Router>({
	url: 'http://localhost:5173/trpc'
});

export const browserClient = browserClientCreate<Router>({
	url: 'http://localhost:5173/trpc'
});
