# SvelteKit TRPC

An easy to use and integrate abstraction of the amazing [`tRPC framework`](https://github.com/trpc/trpc).


## Installing dependencies

First you want to install the necessary npm packages

```bash
# Install npm package
npm add @sveltering/tRPC
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

This is the most minimal implementation!
```typescript
// Import the server file 
import { TRPC } from '@sveltering/trpc/server';

// Create the TRPC object
export const t = new TRPC({
	path: '/trpc', // The path you want to serve tRPC e.g. mysite.com/trpc
});
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://kit.svelte.dev/docs/adapters) for your target environment.


