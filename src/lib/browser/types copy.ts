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

export type storeResponseValue<V, B> = [B] extends [false]
	? Writable<
			| {
					loading: true;
					error: false;
					success: false;
			  }
			| {
					loading: false;
					response: V;
					error: false;
					success: true;
			  }
			| {
					loading: false;
					error: true;
					message: any;
					success: false;
			  }
	  >
	: Writable<
			| {
					loading: true;
					error: false;
					success: false;
					response: undefined;
					message: undefined;
			  }
			| {
					loading: false;
					response: V;
					error: false;
					success: true;
					message: undefined;
			  }
			| {
					loading: false;
					error: true;
					message: any;
					success: false;
					response: undefined;
			  }
	  >;

type ReplaceFunctionReturnStore<Fn, B> = Fn extends (...a: infer A) => Promise<infer R>
	? (...a: A) => storeResponseValue<R, B>
	: Fn;

type RecursiveReplaceFunctionReturnsStore<Obj extends object, B extends boolean> = {
	[Key in keyof Obj]: Obj[Key] extends Function
		? ReplaceFunctionReturnStore<Obj[Key], B>
		: Obj[Key] extends { [Key2: string]: any }
		? RecursiveReplaceFunctionReturnsStore<Obj[Key], B>
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

export type storeClientOpt<B> = Omit<browserClientOpt, 'browserOnly'> & {
	always?: B;
	interceptResponse?: (response: any, path: string) => Promise<{}> | {};
	interceptError?: (message: any, path: string) => Promise<{}> | {};
};

export type storeCC<T extends AnyRouter, B extends boolean> = RecursiveReplaceFunctionReturnsStore<
	ReturnType<typeof createTRPCProxyClient<T>>,
	B
>;

export type EndpointReturnType<T extends (...args: any) => Promise<any>> = T extends (
	...args: any
) => Promise<infer R>
	? R
	: any;

export type storeCC2<T extends AnyRouter, B extends boolean> = RecursiveReplaceFunctionReturnsStore<
	ReturnType<typeof createTRPCProxyClient<T>>,
	B
>;

/*
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 */

export type EndpointsToStore<T> = T extends object //
	? {
			[K in keyof T & string as [K] extends ['query' | 'mutate'] // If key in object is "query" or "mutate"
				? T[K] extends (...args: any) => any // If key in object is "query" or "mutate"
					? 'store' //if object[key] is a function type rename key to "store"
					: K //if object[key] is not function type, keep original type
				: K]: [K] extends ['query' | 'mutate'] // If key in object is "query" or "mutate"
				? T[K] extends (...args: any) => any //if object[key] is a function type
					? ReturnType<T[K]> //if object[key] is a function type replace type
					: EndpointsToStore<T[K]> //if object[key] is not function type check for nested types
				: EndpointsToStore<T[K]>;
	  }
	: T;
