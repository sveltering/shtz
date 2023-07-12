import routes from '$trpc/routes';
// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			TRPC: ReturnType<typeof routes.createCaller>;
		}
		// interface PageData {}
		// interface Platform {}
	}
}

export {};
