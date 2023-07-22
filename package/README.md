# SvelteKit TRPC

An easy to use and integrate abstraction of the amazing [tRPC framework](https://github.com/trpc/trpc) designed for [SvelteKit](https://github.com/sveltejs/kit).

## Understanding tRPC w/ SvelteKit

tRPC is useful for quickly setting up end points which are type safe end to end providing full intellisense sugesstion.

Simply put, this means whatever endpoints you write on the backend, the return types will automatically be typed when used on the front end guaranteeing end to end type safety.

The only drawback is, you're backend must be closely tied to the front end, which is kinda what sveltekit is all about making them a match made in heaven.

## Going under the hood

To really understand what is going under the hood, let's go through the order of events

A lot of the concepts and features of tRPC are very circular. Kind of like the chicken and the egg, which comes first? It's hard to decide which concept to explain first so the next bit makes sense!

**My suggestion:** read the list once, and read it all again.

## The order of events

1. User makes request

   User makes a request to your sveltekit server from their browser

   Each request is given it's own "`event`" object on the server.
2. The `event` object

   The `event` object contains unique information for each and every request e.g. headers, cookies, the `/path` requested  e.g.  `/info` or `/trpc` etc...
3. Setting the scene with context also known as `ctx`

   Before we send the `event` data to any of the procedures or endpoints, we need to create a context object.

   More on procedures and endpoints soon.

   For now let's focus on context/`ctx`

   In the example below we create our `t` object using the `TRPC` class.

   We tell the class we want to intercept the `/trpc` path for any requests to our trpc endpoints.

   We also create our context or `ctx`.

   In the context function we check for any cookies with name `"sessionId"`

   We then use this `sessionId` to see if we have an active session for a user.

   Finally we determine if the user is signed in and if they are an admin and we return these as the `ctx` object.


   **`./src/trpc/init.ts`**
   ```ts
	/// file: ./src/trpc/init.ts
    import { TRPC } from '@sveltering/trpc/server';
    import { getUser } from 'made-up-functions-which-dont-exist';

    export const t = new TRPC({
    	path: '/trpc',
    	context: async function (event) {

    		const sessionId = event?.cookies.get('sessionId');
    		const user: User | null = await getUser(sessionId);
    		const userIdSignedIn = !!user;
    		const userIsAdmin = user?.type === 'admin';

    		return {
    			welcome: 'Hello and welcome!',
    			user,
    			userIdSignedIn,
    			userIsAdmin
    		};

    	}
    });
   ```

   From the example above our `ctx` object will be of the following type

   ```ts
   type Context = {
   	welcome: string,
   	user: User | null,
   	userIdSignedIn: boolean,
   	userIsAdmin: boolean
   }
   ```

   This context is then passed on to all our procedures and endpoints.
4. Was the request path `/trpc` or was it for `/info` etc ?

	In the `hooks.server.ts` we create and export the `handle()` method where we can check every request's `event` object and determine if the request is for the path `/trpc` or `/info` etc

	Firstly we need to create our TRPCHook method as well at the types for the router (this will error as we havn't started working on the router yet, but don't worry)

	**`./src/trpc/hooks.ts`**
	```ts
	import { t } from './init';
	import routes from './routes';

	export type Router = typeof routes;
	export const TRPCHook = t.hook(routes);
	```
	Now we will import this `TRPChook` method into our `hooks.server.ts` file

	The TRPCHook method determines what to do with each request.

	If the request was for `/info` etc, we pass this back to sveltekit and you can expect normal sveltekit behavior.

	If the request was for `/trpc` however, we bypass sveltekits normal behaviour and send this to tRPC to do it's magic.


	**`./src/hooks.server.ts`**
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





5. Endpoints and routes...

   Endpoints are where you keep all your application logic

   Routes are where the endpoints are stored

   In the example below, we have the endpoint `.welcomeMessage()`

   We also have the routes `user` and `admin`.

   There routes can have their own endpoints and maybe even more nested routes with their own endpoints.

   These routes could have be created directly on the main router, however, by separating these routes we can keep our code clean and related logic within in their own files. At least that's how I like to do it.

   **`./src/trpc/routes/index.ts`**
   ```ts
   import { t } from '../init';
   import user from './user';
   import admin from './admin';

   export default t.router({
   	user,
   	admin,
   	welcomeMessage: t.procedure.query(function ({ ctx }) {
   		return ctx?.welcome;
   	})
   });
   ```

   To call `.welcomeMessage()` in the example above we would simply call `client.welcomeMessage()`

   More on `client` later!

   **`./src/trpc/routes/user/index.ts`**
   ```ts
   import { t } from '../../init';
   export default t.router({
   	welcomeUser: t.procedure.query(function ({ ctx }) {
   		return ctx.userIdSignedIn
   			? 'Welcome to the my website'
   			: `Welcome ${ctx.user.name} to my website`;
   	})
   });

   ```

   To call `.welcomeUser()` we would simply call `client.user.welcomeUser()`
6. Procedures/middleware...

   Procedures are methods which are the final interception before a request is pased on to the endpoint.

   `t.procedure` is the default procedure and is considered a "public" procedure meaning it has no restrictions and will always allow the request to reach the endpoint.

   You do have the ability to extend on this procedure to be more restrictive on whether a request reaches an endpoint, as you will see below in the admin route example.

   In the example below, we create our `adminProcedure` where we extend on the public procedure by checking the context for `ctx.userIsAdmin`.

   We then use this `adminProcedure` as a guard for the `.deleteUser()` endpoint

   If `ctx.userIsAdmin` is true, the `.deleteUser()` endpoint will run

   If `ctx.userIsAdmin` is false, an error will be thrown and the `.deleteUser()` endpoint will not run

   **`./src/trpc//admin/index.ts`**
   ```ts
   import { t } from '../../init';
   import { z } from 'zod';

   const adminProcedure = t.procedure.use(
   	t.middleware(async function ({ ctx, next }) {
   		if (!ctx.userIsAdmin) {
   			throw t.error('Only admins can access this route.', 'UNAUTHORIZED');
   		}
   		return next({ ctx });
   	})
   );

   const schema = {
   	userId: z.string().length(15)
   };

   export default t.router({
   	deleteUser: adminProcedure.input(schema.userId).mutation(({ input: userId }) => {
   		// Delete user with id of userId
   	})
   });
   ```
7. Browser client

   Clients are how we call the trpc endpoints.

   Clients can be used on the backend as well as the browser, however their suitability for backend or front end varies, as I will explain further on.

   Firstly we need to create our `browserClient.ts` file

	```ts
	import { loadClientCreate, storeClientCreate, browserClientCreate } from '@sveltering/trpc/browser';
	import type { Router } from './hooks.js';

	export const loadClient = loadClientCreate<Router>({
		url: 'http://localhost:5173/trpc'
	});

	export const storeClient = storeClientCreate<Router>({
		always: true,
		url: 'http://localhost:5173/trpc'
	});

	export const browserClient = browserClientCreate<Router>({
		url: 'http://localhost:5173/trpc'
	});
	```

	**loadClient**
	
	The `loadClient` is primarily designed to be used in `+page.ts` and `+layout.ts` files.



	The `loadClient` is tightly linked to the `origin` and `originBypass` options on the TRPC object, and this is where it really has it's use.





8. **THE END**

   Well that was `event`ful! Not sorry.

   Now read it all over again one more time so it makes sense!

## Quick setup guide [OR in-depth setup guide with explanations](#in-depth-setup-guide-with-explanations)

### Install dependencies

Install tRPC class

```bash
npm add @sveltering/tRPC
```

### Create setup files in terminal [OR manual setup](#create-setup-files-manually)

Open terminal at the root dir of your app.
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

Initializing the TRPC class. This is a simple example with context added.
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

This file is to create the type definitions of your routes which is imperitive for when we create the clients that we will be calling the endpoints from later.
The `t.hook()` method creates a function which accepts an `event` argument in the `hooks.server.ts` file. In this file is where the magic happens.

```ts
import { t } from './init';
import routes from './routes';

export type Router = typeof routes;
export const TRPCHook = t.hook(routes);
```

### Intercept incoming requests in `src/hooks.server.ts ` and return TRPC response if applicable

Time for magic!
The handle function is where all events are handed off too.
The TRPCHook method we create earlier is imported.
This files checks events for requests on the path you set on the `TRPC` object and routes the request as appropriate.
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

There are 3 clients which can be used in the browser. `storeClient`, `browserClient` and `loadClient`.
Store client is the easiest, most powerful and the most useful of the lot.
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

Using the store client we created in the last example.
This client is perfect for quick and easy implementation with no need for async or await!
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

Load functions in `+page.ts` files run on both the back end and front end.
This is useful if you need the data to be hydrated into the document which will be served in the document requested (view the page source).
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
