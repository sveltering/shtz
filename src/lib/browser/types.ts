import type { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AnyRouter } from '@trpc/server';
import type { LoadEvent } from '@sveltejs/kit';
import type { EndpointsToStore } from './storeClientCreate.types';
import type { TRPCClientError } from '@trpc/client';

/*
 *
 *
 *
 *
 *
 *
 *
 * FUNCTIONAL TYPES
 */

export type ArgumentTypes<F extends Function> = F extends (...args: infer A) => any ? A : never;

export type EndpointReturnType<T extends (...args: any) => Promise<any>> = T extends (
	...args: any
) => Promise<infer R>
	? R
	: any;

type RouterReturnType<T extends AnyRouter> = ReturnType<typeof createTRPCProxyClient<T>>;

/*
 *
 *
 *
 *
 *
 *
 *
 * BROWSER CLIENT TYPES
 */

type ReplaceFunctionReturnOrUndefined<Fn> = Fn extends (...a: infer A) => Promise<infer R>
	? (...a: A) => Promise<R | undefined>
	: Fn;

type RecursiveReplaceFunctionReturnsOrUndefined<Obj extends object> = {
	[Key in keyof Obj]: Obj[Key] extends Function
		? ReplaceFunctionReturnOrUndefined<Obj[Key]>
		: Obj[Key] extends { [Key2: string]: any }
		? RecursiveReplaceFunctionReturnsOrUndefined<Obj[Key]>
		: Obj[Key];
};

export interface browserClientOpt {
	url: string;
	browserOnly?: boolean;
	transformer?: ArgumentTypes<typeof createTRPCProxyClient>[0]['transformer'];
	batchLinkOptions?: Omit<ArgumentTypes<typeof httpBatchLink>[0], 'url'>;
}

export interface browserClientOptF extends browserClientOpt {
	browserOnly: false;
}

export type browserOCC<T extends AnyRouter> = RecursiveReplaceFunctionReturnsOrUndefined<
	RouterReturnType<T>
>;
export type browserFCC<T extends AnyRouter> = RouterReturnType<T>;

/*
 *
 *
 *
 *
 *
 *
 *
 * LOAD CLIENT TYPES
 */
export interface loadClientOpt extends Omit<browserClientOpt, 'browserOnly'> {
	batchLinkOptions?: Omit<ArgumentTypes<typeof httpBatchLink>[0], 'url' | 'fetch'>;
}
export type loadCC<T extends AnyRouter> = (event: LoadEvent) => RouterReturnType<T>;

/*
 *
 *
 *
 *
 *
 *
 *
 * STORE CLIENT TYPES
 */

export type storeClientOpt = Omit<browserClientOpt, 'browserOnly'> & {
	interceptData?: (data: any, path: string) => Promise<{}> | {};
	interceptError?: (error: TRPCClientError<any>, path: string) => Promise<{}> | {};
};

export type storeCC<T extends AnyRouter> = EndpointsToStore<RouterReturnType<T>>;
// consider using inferRouterInputs type
