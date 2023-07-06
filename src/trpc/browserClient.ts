import type { Router } from './hooks.js';
import { storeClientCreate } from '$lib/browser';

export const storeClient = storeClientCreate<Router>({
	always: true,
	url: 'http://localhost:5173/trpc'
});
