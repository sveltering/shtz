import { loadClientCreate } from '@sveltering/trpc/browser';
import type { Router } from '$trpc/hooks';

export const loadClient = loadClientCreate<Router>({
	url: 'http://localhost:5173/trpc'
});
