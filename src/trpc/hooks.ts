import { t } from './init';
import routes from './routes';

// type EndPointsToStore<T> = T extends object //
// 	? { [K in keyof T]: [K] extends ['query'] ? 'string' : EndPointsToStore<T[K]> }
// 	: T;

// type EndPointsToStore<T> = T extends object //
// 	? {
// 			[K in keyof T & string as [K] extends ['query' | 'mutate'] ? 'store' : K]: [K] extends [
// 				'query' | 'mutate'
// 			]
// 				? ReturnType<T[K]>
// 				: EndPointsToStore<T[K]>;
// 	  }
// 	: T;

////
import type { createTRPCProxyClient } from '@trpc/client';

export type Router = typeof routes;
export const TRPCHook = t.hook(routes);
// export const TRPCHandlefetch = t.handleFetch();
