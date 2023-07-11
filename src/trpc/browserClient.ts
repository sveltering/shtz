import { loadClientCreate, storeClientCreate, browserClientCreate } from '$lib/browser';
import type { Router } from './hooks.js';

export const loadClient = loadClientCreate<Router>({
	url: 'http://localhost:5173/trpc'
});

export const storeClient = storeClientCreate<Router>({
	url: 'http://localhost:5173/trpc'
});

export const browserClient = browserClientCreate<Router>({
	url: 'http://localhost:5173/trpc'
});
