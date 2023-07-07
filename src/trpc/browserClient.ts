import type { Router } from './hooks.js';
import { browserClientCreate, storeClientCreate, storeClientCreate2 } from '$lib/browser';

export const storeClient = storeClientCreate<Router>({
	url: 'http://localhost:5173/trpc'
});

export const browserClient = browserClientCreate<Router>({
	url: 'http://localhost:5173/trpc'
});

export const storeClient2 = storeClientCreate2<Router>({
	url: 'http://localhost:5173/trpc'
});
