import type { LoadEvent } from '@sveltejs/kit';
import type { AnyRouter } from '@trpc/server';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import { writable, type Writable } from 'svelte/store';

export { browserClientCreate, storeClientCreate, loadClientCreate };

type ArgumentTypes<F extends Function> = F extends (...args: infer A) => any ? A : never;

type ReplaceFunctionReturn<Fn> = Fn extends (...a: infer A) => Promise<infer R>
	? (...a: A) => Promise<R | undefined>
	: Fn;

type RecursiveReplaceFunctionReturns<Obj extends object> = {
	[Key in keyof Obj]: Obj[Key] extends Function
		? ReplaceFunctionReturn<Obj[Key]>
		: Obj[Key] extends { [Key2: string]: any }
		? RecursiveReplaceFunctionReturns<Obj[Key]>
		: Obj[Key];
};
export type EndpointReturnType<T extends (...args: any) => Promise<any>> = T extends (
	...args: any
) => Promise<infer R>
	? R
	: any;

interface ClientOptions_I {
	url: string;
	browserOnly?: boolean;
	transformer?: ArgumentTypes<typeof createTRPCProxyClient>[0]['transformer'];
	batchLinkOptions?: Omit<ArgumentTypes<typeof httpBatchLink>[0], 'url'>;
}

interface ClientOptions_I_not_browserOnly extends ClientOptions_I {
	browserOnly: false;
}

type browserOnlyClientCreateType<T extends AnyRouter> = RecursiveReplaceFunctionReturns<
	ReturnType<typeof createTRPCProxyClient<T>>
>;
type browserClientCreateType<T extends AnyRouter> = ReturnType<typeof createTRPCProxyClient<T>>;

function browserClientCreate<T extends AnyRouter>(
	options: ClientOptions_I_not_browserOnly
): browserClientCreateType<T>;
function browserClientCreate<T extends AnyRouter>(
	options: ClientOptions_I
): browserOnlyClientCreateType<T>;
function browserClientCreate<T extends AnyRouter>(options: ClientOptions_I) {
	const { url, batchLinkOptions, browserOnly } = options;
	let onlyBrowser = browserOnly === false ? false : true;

	if (onlyBrowser && typeof window === 'undefined') {
		return new Proxy({}, pseudoHandler) as unknown as any;
	}
	//@ts-ignore
	return createTRPCProxyClient<T>({
		links: [httpBatchLink({ ...batchLinkOptions, url })]
	});
}

interface LClientOptions_I extends Omit<ClientOptions_I, 'browserOnly'> {
	batchLinkOptions?: Omit<ArgumentTypes<typeof httpBatchLink>[0], 'url' | 'fetch'>;
}
function loadClientCreate<T extends AnyRouter>(options: LClientOptions_I) {
	const { url, batchLinkOptions } = options;

	return function ({ fetch }: LoadEvent) {
		//@ts-ignore
		return createTRPCProxyClient<T>({
			links: [httpBatchLink({ ...batchLinkOptions, url, fetch })]
		});
	};
}

function psuedoCreateTRPCProxyClient() {
	return new Proxy(undefinedFn, {
		get() {
			return pseudoCreateInnerProxy();
		}
	});
}

const undefinedFn = () => undefined;
const pseudoHandler: any = {
	get: (target: any, name: any) => {
		const prop = target[name];
		return new Proxy(undefinedFn, pseudoHandler);
	}
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

type storeClientCreateType<T extends AnyRouter> = RecursiveReplaceFunctionReturnsStore<
	ReturnType<typeof createTRPCProxyClient<T>>
>;

function storeClientCreate<T extends AnyRouter>(
	options: Omit<ClientOptions_I, 'browserOnly'>
): storeClientCreateType<T> {
	const { url, batchLinkOptions } = options;

	if (typeof window === 'undefined') {
		return pseudoCreateInnerProxy() as unknown as storeClientCreateType<T>;
	}

	//@ts-ignore
	let proxyClient = createTRPCProxyClient<T>({
		links: [httpBatchLink({ ...batchLinkOptions, url })]
	});
	return createInnerProxy(proxyClient, []) as unknown as storeClientCreateType<T>;
}

//
function createInnerProxy(callback: any, path: string[]) {
	const proxy: unknown = new Proxy(undefinedFn, {
		get(_obj, key) {
			if (typeof key !== 'string' || key === 'then') {
				return undefined;
			}
			return createInnerProxy(callback, [...path, key]);
		},
		apply(_1, _2, args) {
			let endpoint = callback;
			for (let i = 0, iLen = path.length; i < iLen; i++) {
				endpoint = endpoint[path[i] as keyof typeof endpoint];
			}

			let store = writable({ error: false, response: undefined, loading: true });

			endpoint(...args)
				.then((response: any) => {
					store.set({ error: false, response, loading: false });
				})
				.catch((error: any) => {
					store.set({ error, response: undefined, loading: false });
				});

			return store;
		}
	});

	return proxy;
}

function pseudoCreateInnerProxy(): any {
	return new Proxy(undefinedFn, {
		get() {
			return pseudoCreateInnerProxy();
		},
		apply() {
			return writable({ error: false, response: undefined, loading: true });
		}
	});
}
