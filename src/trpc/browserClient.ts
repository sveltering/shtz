import {
	loadClientCreate,
	storeClientCreate,
	browserClientCreate,
	type EndpointReturnType
} from '@sveltering/trpc/browser';
import type { Router } from '$trpc/hooks';

export const loadClient = loadClientCreate<Router>({
	url: 'http://localhost:5173/trpc'
});

export const storeClient = storeClientCreate<Router>({
	url: 'http://localhost:5173/trpc'
});

export const browserClient = browserClientCreate<Router>({
	url: 'http://localhost:5173/trpc'
});

export type { EndpointReturnType };
