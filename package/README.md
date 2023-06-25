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
&& touch init.ts hooks.ts browserClient.ts serverClient.ts \
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
 ┃ ┣ 📜browserClient.ts
 ┃ ┣ 📜hooks.ts
 ┃ ┣ 📜init.ts
 ┃ ┗ 📜serverClient.ts
 ┗ 📜hooks.server.ts
```
### Create TRPC instance in `trpc/init.ts `
```typescript
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
```typescript
import { t } from '../init';

export default t.router({
	welcomeMessage: t.procedure.query(function ({ ctx }) {
		return ctx?.welcome;
	})
});
```
### Create the TRPCHook in `trpc/hooks.ts ` to intercept incoming requests
```typescript
import { t } from './init';
import routes from './routes';

export type Router = typeof routes;
export const TRPCHook = t.hook(routes);
```
### Intercept incoming requests in `src/hooks.server.ts ` and return TRPC response if applicable
```typescript
import { TRPCHook } from './trpc/hooks';

export async function handle({ event, resolve }) {
	const TRPCResponse = await TRPCHook(event);
	if (TRPCResponse) {
		return TRPCResponse;
	}
	return await resolve(event);
}
```
### Create the browser client in `trpc/browserClient.ts ` for use on front end
```typescript
import { browserClientCreate } from '@sveltering/trpc/browser';
import type { Router } from './hooks';

export const browserClient = browserClientCreate<Router>({
	url: 'http://localhost:5173/trpc'
});
```
### Create server client in `trpc/serverClient.ts ` for use on backend
```typescript
import { syncServerClientCreate } from '@sveltering/trpc/server';
import { t } from './init';
import type { Router } from './hooks';

export const serverClient = syncServerClientCreate<Router>(t);
```


## Quick usage guide [OR in-depth usage guide with explanations](#in-depth-usage-guide-with-explanations)


### Using the browser client in `src/routes/+page.svelte`
```svelte
import { browserClientCreate } from '@sveltering/trpc/browser';
import type { Router } from './hooks';

export const browserClient = browserClientCreate<Router>({
	url: 'http://localhost:5173/trpc'
});
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


## In depth setup guide with explanations
## Installing dependencies

First you want to install the necessary npm packages

```bash
# Install npm package
npm add @sveltering/tRPC
```



```bash
mkdir -p src/trpc && cd "$_" \
&& touch init.ts hooks.ts browserClient.ts serverClient.ts \
&& mkdir -p routes && cd "$_" \
&& touch index.ts && cd ../../../
# Make dir `trpc` and move into it
# Make files `init.ts`, `hooks.ts`, `browserClient.ts`, `serverClient.ts`
# Make dir `routes` and move into it
# Make file `index.ts` and move back to root dir of app
```


## Initial setup 

1. Once you've install the package, create a folder in the `./src` directory.
2. This folder is where we will be creating our initiation file, clients and routes
3. I will name it `trpc` for the purpose of this documentation, but...
4. Feel free to name it as you please, later we will be setting up a path alias for this directory anyway

### `./src` Directory after creating `trpc` folder
Once you've created the trpc directory it should now look something like this.
```
📦src
 ┣ 📂routes
 ┃ ┗ 📜+page.svelte
 ┣ 📂trpc
 ┣ 📜app.d.ts
 ┣ 📜app.html
 ┗ 📜index.test.ts
 ```

### Initiation (`init.ts`) file
1. In the newly created `trpc` folder, lets create our `init.ts` file
2. In this file we will create our `TRPC` object which has all the methods we need to build our hooks method, handleFetch as well as our browser and server clients.
3. This file will also contain any procedures, which are simply middleware for your routes.
4. Don't worry, it will all make sense soon!

This is the most minimal implementation!\
As you can see we export `const t`.  **THIS IS STRICTLY FOR IMPORTING ON THE BACKEND!!**
```typescript
// Import the server file 
import { TRPC } from '@sveltering/trpc/server';

// Create the TRPC object
export const t = new TRPC({
	path: '/trpc', // The path you want to serve tRPC e.g. mysite.com/trpc
});
```




## In depth usage guide with explanations