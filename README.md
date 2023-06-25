# SvelteKit TRPC

An easy to use and integrate abstraction of the amazing [tRPC framework](https://github.com/trpc/trpc) designed for [SvelteKit](https://github.com/sveltejs/kit).

## Quick setup guide [OR in-depth setup guide with explanations](#in-depth-setup-guide-with-explanations)

### Install dependencies
Install tRPC class
```bash
npm add @sveltering/tRPC
```
### Create setup files in terminal [OR manual setup](#create-setup-files-manually)
Open terminal at the root dir of your app. \
Created necessary files and folders.

```bash
cd src && touch hooks.server.ts
&& mkdir -p trpc && cd "$_" \
&& touch init.ts hooks.ts browserClients.ts serverClients.ts \
&& mkdir -p routes && cd "$_" \
&& touch index.ts && cd ../../../
```
### Create setup files manually
Create your files manually in the hierarchy displayed below, if you're on windows!
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
Initializing the TRPC class. This is a simple example with context added. \
The object returned by the context function is per individual request and is passed to all the endpoints and can be destructured as `({ctx}) => {}`
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
Our first routes. As you can see the context object is made available to the endpoint.
```ts
import { t } from '../init';

export default t.router({
	welcomeMessage: t.procedure.query(function ({ ctx }) {
		return ctx?.welcome;
	})
});
```
### Create the TRPCHook in `trpc/hooks.ts ` to intercept incoming requests
This file is to create the type definitions of your routes which is imperitive for when we create the clients that we will be calling the endpoints from later.\
The `t.hook()` method creates a function which accepts an `event` argument in the `hooks.server.ts` file. In this file is where the magic happens. 

```ts
import { t } from './init';
import routes from './routes';

export type Router = typeof routes;
export const TRPCHook = t.hook(routes);
```
### Intercept incoming requests in `src/hooks.server.ts ` and return TRPC response if applicable
Time for magic! \
The handle function is where all events are handed off too.\
The TRPCHook method we create earlier is imported. \
This files checks events for requests on the path you set on the `TRPC` object and routes the request as appropriate. \
If it determines the event is for TRPC it returns a response, if not it returns false and the handle function then resolves it as it would normally!
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
There are 3 clients which can be used in the browser. `storeClient`, `browserClient` and `loadClient`. \
Store client is the easiest, most powerful and the most useful of the lot. \
This client simplifies using tRPC x100 in coparison to the rest of the clients, with the one drawback is it doesn't hydrate the document served.
```ts
import { storeClientCreate } from '@sveltering/trpc/browser';
import type { Router } from './hooks.js';

export const storeClient = storeClientCreate<Router>({
	always: true, //I'll explain this later. go with it 🤫!
	url: 'http://localhost:5173/trpc'
});
```


## Quick usage guide [OR in-depth usage guide with explanations](#in-depth-usage-guide-with-explanations)


### Using the store client in `src/routes/+page.svelte`
Using the store client we created in the last example. \
This client is perfect for quick and easy implementation with no need for async or await! \
No need for top-level awaits!!! (this is my favourties feature! 😬)
```html
<script lang="ts">
	import { storeClient } from '../trpc/browserClients';
	let welcomeMessage = storeClient.welcomeMessage.query();
</script>

{$welcomeMessage?.response ?? $welcomeMessage?.message ?? 'Loading....'}
```
## OR
```html
<script lang="ts">
	import { storeClient } from '../trpc/browserClients';
	let welcomeMessage = storeClient.welcomeMessage.query();
</script>

{#if $welcomeMessage.loading}
	Loading...
{:else if $welcomeMessage.error}
	{$welcomeMessage.message}
{:else if $welcomeMessage.success}
	{$welcomeMessage.response}
{/if}

```

### Using the load client in `src/routes/+page.svelte` and `src/routes/+page.ts`
Load functions in `+page.ts` files run on both the back end and front end.\
This is useful if you need the data to be hydrated into the document which will be served in the document requested (view the page source).\
Calls to the backend directly from the backend without hitting a DNS server can be achieved using the bypassOrigin option, [more on that here](#trpc-handlefetch-method) 

 `trpc/serverClient.ts`
```ts
import { syncServerClientCreate } from '@sveltering/trpc/server';
import { t } from './init';
import type { Router } from './hooks';

export const serverClient = syncServerClientCreate<Router>(t);
```
`src/routes/+page.ts`
```ts
import type { LoadEvent } from '@sveltejs/kit';
import { loadClient } from '../trpc/browserClients';

export const load = async (event: LoadEvent) => {
	return {
		message: await loadClient(event).welcomeMessage.query()
	};
};
```
`src/routes/+page.svelte`
```html
<script lang="ts">
	export let data;
</script> 
{data.message}
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