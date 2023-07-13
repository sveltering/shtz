import type { TRPCLocals } from '$trpc/hooks';
// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals extends TRPCLocals {}
		// interface PageData {}
		// interface Platform {}
	}
}

export {};
