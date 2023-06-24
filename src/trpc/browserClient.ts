import type { Router } from './hooks.js';
import { browserClientCreate, type EndpointReturnType } from '$lib/browser';

export const browserClient = browserClientCreate<Router>({
	url: 'http://localhost:5173/trpc'
});

export type { EndpointReturnType };
