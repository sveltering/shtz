import { t } from './init';
import routes from './routes';
// import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';

export type Router = typeof routes;
export const TRPCHook = t.hook(routes);
// // export const TRPCHandlefetch = t.handleFetch();
// type one = inferRouterInputs<Router>["welcomeName"]
// type two = inferRouterOutputs<Router>["user"]["welcome"]
