import type { CreateTRPCProxyClient, createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AnyRouter } from '@trpc/server';
import type { LoadEvent } from '@sveltejs/kit';
import type { MakeStoreType } from './storeClientCreate.types.js';
import type { TRPCClientError } from '@trpc/client';
import type { ArgumentTypes } from '../types.js';

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

type ChangeReturns<Obj extends object> = {
	[Key in keyof Obj]: Obj[Key] extends Function
		? ReplaceFunctionReturnOrUndefined<Obj[Key]>
		: Obj[Key] extends { [Key2: string]: any }
		? ChangeReturns<Obj[Key]>
		: Obj[Key];
};

type transformerOpts = ArgumentTypes<typeof createTRPCProxyClient>[0]['transformer'];
type batchLinkOptions = Omit<ArgumentTypes<typeof httpBatchLink>[0], 'url'>;

export type browserClientOpt = {
	url: string;
	browserOnly?: boolean;
	transformer?: transformerOpts;
	batchLinkOptions?: batchLinkOptions;
};

export type browserClientOptF = browserClientOpt & {
	browserOnly: false;
};

export type browserOCC<T extends AnyRouter> = ChangeReturns<CreateTRPCProxyClient<T>>;
export type browserFCC<T extends AnyRouter> = CreateTRPCProxyClient<T>;

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
type loadBatchLinkOptions = Omit<ArgumentTypes<typeof httpBatchLink>[0], 'url' | 'fetch'>;
export interface loadClientOpt extends Omit<browserClientOpt, 'browserOnly'> {
	batchLinkOptions?: loadBatchLinkOptions;
}
export type loadCC<T extends AnyRouter> = (event: LoadEvent) => CreateTRPCProxyClient<T>;

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

export type storeCC<T extends AnyRouter> = MakeStoreType<CreateTRPCProxyClient<T>>;
// consider using inferRouterInputs type
