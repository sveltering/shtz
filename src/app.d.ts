import type { Router } from './trpc/hook.js';
// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			TRPC: () => ReturnType<Router['createCaller']>;
		}
		// interface PageData {}
		// interface Platform {}
	}
}

export {};
