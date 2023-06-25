# SvelteKit TRPC

An easy to use and integrate abstraction of the amazing [tRPC framework](https://github.com/trpc/trpc) designed for [SvelteKit](https://github.com/sveltejs/kit).

## Quick setup guide [OR in-depth setup guide with explanations](#in-depth-setup-guide-with-explanations)

### Install dependencies
```bash
npm add @sveltering/tRPC
```
### Create setup files in terminal [OR manual setup](#create-setup-files-manually)
Open terminal at the root dir of your app.
```bash
cd src && touch hooks.server.ts
&& mkdir -p trpc && cd "$_" \
&& touch init.ts hooks.ts browserClients.ts serverClients.ts \
&& mkdir -p routes && cd "$_" \
&& touch index.ts && cd ../../../
```
### Create setup files manually
Create your files manually in the hierarchy displayed below
```
📦src
 ┣ 📂trpc
 ┃ ┣ 📂routes
 ┃ ┃ ┗ 📜index.ts
 ┃ ┣ 📜browserClients.ts
 ┃ ┣ 📜hooks.ts
 ┃ ┣ 📜init.ts
 ┃ ┗ 📜serverClients.ts
 ┗ 📜hooks.server.ts
```
### Create TRPC instance in `trpc/init.ts `
```ts
import { TRPC } from '@sveltering/trpc/server';

export const t = new TRPC({
	path: '/trpc',
	context: function (event) {
		return {
			welcome: 'Hello and welcome!',
			isSignedIn: event?.locals.hasOwnProperty('user')
		};
	}
});
```
### Setup first route in `trpc/routes/index.ts`
```ts
import { t } from '../init';

export default t.router({
	welcomeMessage: t.procedure.query(function ({ ctx }) {
		return ctx?.welcome;
	})
});
```
### Create the TRPCHook in `trpc/hooks.ts ` to intercept incoming requests
```ts
import { t } from './init';
import routes from './routes';

export type Router = typeof routes;
export const TRPCHook = t.hook(routes);
```
### Intercept incoming requests in `src/hooks.server.ts ` and return TRPC response if applicable
```ts
import { TRPCHook } from './trpc/hooks';

export async function handle({ event, resolve }) {
	const TRPCResponse = await TRPCHook(event);
	if (TRPCResponse) {
		return TRPCResponse;
	}
	return await resolve(event);
}
```
### Create the store client in `trpc/browserClients.ts ` for use on front end
```ts
import { storeClientCreate } from '@sveltering/trpc/browser';
import type { Router } from './hooks.js';

export const storeClient = storeClientCreate<Router>({
	always: true,
	url: 'http://localhost:5173/trpc'
});
```


## Quick usage guide [OR in-depth usage guide with explanations](#in-depth-usage-guide-with-explanations)


### Using the store client in `src/routes/+page.svelte`
```html
<script lang="ts">
	import { storeClient } from '../trpc/browserClients';
	let welcomeMessage = storeClient.welcomeMessage.query();
</script>

{$welcomeMessage?.response ?? $welcomeMessage?.message ?? 'Loading....'}
```











\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\

# 🚧🚧🚧🚧 Work in progess 🚧🚧🚧🚧

## In depth setup guide with explanations

### Installing dependencies
### Directory Structure
### Setup directory alias
### Understanding tRPC
### TRPC class and options
### TRPC abstraction getters/methods
### TRPC hooks method
### TRPC handleFetch method
### Procedures/middleware
### Routes
### serverClient
### asyncServerClient
### browserClient
### storeClient
### loadClient

## In depth usage guide with explanations
### TRPC hooks method
### TRPC handleFetch method
### Procedures/middleware
### Routes
### serverClient
### asyncServerClient
### browserClient
### storeClient
### loadClient