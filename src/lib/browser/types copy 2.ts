import type { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AnyRouter } from '@trpc/server';
import type { LoadEvent } from '@sveltejs/kit';
import type { Writable } from 'svelte/store';

/*

type RemoveSubscribes<Obj> = Obj extends object
	? {
			[Key in keyof Obj & string as [Key] extends ['subscribe']
				? Obj[Key] extends FunctionType
					? never
					: Key
				: Key]: [Key] extends ['subscribe']
				? Obj[Key] extends FunctionType
					? never
					: RemoveSubscribes<Obj[Key]>
				: RemoveSubscribes<Obj[Key]>;
	  }
	: Obj;


	type RemoveSubscribes<Obj> = Obj extends object
	? {
			[Key in keyof Obj & string as [Key] extends ['subscribe']
				? Obj[Key] extends FunctionType
					? never
					: Key
				: Key]: RemoveSubscribes<Obj[Key]>;
	  }
	: Obj;

type EndpointsToStore<T> = T extends object //
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



type RemoveQueries<Obj extends object, Key extends keyof Obj> = Obj[Key] extends FunctionType
	? 'query'
	: RemoveProcedures<Obj[Key]>;
type RemoveMutates<Obj extends object, Key extends keyof Obj> = Obj[Key] extends FunctionType
	? 'mutate'
	: RemoveProcedures<Obj[Key]>;

type RemoveProcedures<Obj> = Obj extends object
	? {
			[Key in keyof Obj & string as [Key] extends ['subscribe']
				? Obj[Key] extends FunctionType
					? never
					: Key
				: Key]: [Key] extends ['query']
				? RemoveQueries<Obj, Key>
				: [Key] extends ['mutate']
				? RemoveMutates<Obj, Key>
				: RemoveProcedures<Obj[Key]>;
	  }
	: Obj;



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

type Flatten<T> = T extends object ? { [K in keyof T]: Flatten<T[K]> } : T;

type FunctionType = (...args: any) => any;

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

interface browserClientOpt {
	url: string;
	browserOnly?: boolean;
	transformer?: ArgumentTypes<typeof createTRPCProxyClient>[0]['transformer'];
	batchLinkOptions?: Omit<ArgumentTypes<typeof httpBatchLink>[0], 'url'>;
}

interface browserClientOptF extends browserClientOpt {
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
	interceptResponse?: (response: any, path: string) => Promise<{}> | {};
	interceptError?: (message: any, path: string) => Promise<{}> | {};
};

type ChangeKeyName<Obj extends object, Key extends keyof Obj> = Obj[Key] extends FunctionType
	? [Key] extends ['subscribe']
		? never
		: [Key] extends ['query']
		? 'qstore'
		: [Key] extends ['mutate']
		? 'mstore'
		: Key
	: Key;
type RemoveQueries<Obj extends object, Key extends keyof Obj> = Obj[Key] extends FunctionType
	? ReturnType<Obj[Key]>
	: RemoveProcedures<Obj[Key]>;
type RemoveMutates<Obj extends object, Key extends keyof Obj> = Obj[Key] extends FunctionType
	? ReturnType<Obj[Key]>
	: RemoveProcedures<Obj[Key]>;

type RemoveProcedures<Obj> = Obj extends object
	? {
			[Key in keyof Obj as ChangeKeyName<Obj, Key>]: [Key] extends ['query']
				? RemoveQueries<Obj, Key>
				: [Key] extends ['mutate']
				? RemoveMutates<Obj, Key>
				: RemoveProcedures<Obj[Key]>;
	  }
	: Obj;

type EndpointsToStore<T extends object> = RemoveProcedures<T>;

export type storeCC<T extends AnyRouter> = EndpointsToStore<RouterReturnType<T>>;
