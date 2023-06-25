import type { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AnyRouter } from '@trpc/server';
import type { LoadEvent } from '@sveltejs/kit';
import type { Writable } from 'svelte/store';

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

type ReplaceFunctionReturnStore<Fn> = Fn extends (...a: infer A) => Promise<infer R>
	? (...a: A) => Writable<{
			loading: boolean;
			response: R | undefined;
			error: boolean;
	  }>
	: Fn;

type RecursiveReplaceFunctionReturnsStore<Obj extends object> = {
	[Key in keyof Obj]: Obj[Key] extends Function
		? ReplaceFunctionReturnStore<Obj[Key]>
		: Obj[Key] extends { [Key2: string]: any }
		? RecursiveReplaceFunctionReturnsStore<Obj[Key]>
		: Obj[Key];
};

type ArgumentTypes<F extends Function> = F extends (...args: infer A) => any ? A : never;

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
	ReturnType<typeof createTRPCProxyClient<T>>
>;
export type browserFCC<T extends AnyRouter> = ReturnType<typeof createTRPCProxyClient<T>>;

export interface loadClientOpt extends Omit<browserClientOpt, 'browserOnly'> {
	batchLinkOptions?: Omit<ArgumentTypes<typeof httpBatchLink>[0], 'url' | 'fetch'>;
}
export type loadCC<T extends AnyRouter> = (
	event: LoadEvent
) => ReturnType<typeof createTRPCProxyClient<T>>;

export type storeClientOpt = Omit<browserClientOpt, 'browserOnly'>;

export type storeCC<T extends AnyRouter> = RecursiveReplaceFunctionReturnsStore<
	ReturnType<typeof createTRPCProxyClient<T>>
>;

export type EndpointReturnType<T extends (...args: any) => Promise<any>> = T extends (
	...args: any
) => Promise<infer R>
	? R
	: any;
