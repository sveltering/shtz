import { t } from './init';
import routes from './routes';
// import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';

import type { createTRPCProxyClient, httpBatchLink, inferRouterProxyClient } from '@trpc/client';

export type Router = typeof routes;
export const TRPCHook = t.hook(routes);

//type a = inferRouterProxyClient<Router>[""]
// // export const TRPCHandlefetch = t.handleFetch();
// type one = inferRouterInputs<Router>["welcomeName"]
// type two = inferRouterOutputs<Router>["user"]["welcome"]
