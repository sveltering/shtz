import type { AnyRouter } from '@trpc/server';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import { writable } from 'svelte/store';

import type {
	browserClientOpt,
	browserClientOptF,
	browserFCC,
	browserOCC,
	loadClientOpt,
	loadCC,
	storeClientOpt,
	storeCC,
	EndpointReturnType
} from './browser.types';

function undefinedFn() {}

function browserClientCreate<T extends AnyRouter>(options: browserClientOptF): browserFCC<T>;
function browserClientCreate<T extends AnyRouter>(options: browserClientOpt): browserOCC<T>;
function browserClientCreate<T extends AnyRouter>(options: browserClientOpt) {
	const { url, batchLinkOptions, browserOnly } = options;

	if (browserOnly !== false && typeof window === 'undefined') {
		return browserPseudoClient();
	}
	//@ts-ignore
	return createTRPCProxyClient<T>({
		links: [httpBatchLink({ ...batchLinkOptions, url })]
	});
}

function loadClientCreate<T extends AnyRouter>(options: loadClientOpt): loadCC<T> {
	const { url, batchLinkOptions } = options;
	return function ({ fetch }) {
		//@ts-ignore
		return createTRPCProxyClient<T>({
			links: [httpBatchLink({ ...batchLinkOptions, url, fetch })]
		});
	};
}

function storeClientCreate<T extends AnyRouter>(options: storeClientOpt): storeCC<T> {
	const { url, batchLinkOptions } = options;

	if (typeof window === 'undefined') {
		return storePseudoClient() as unknown as storeCC<T>;
	}

	//@ts-ignore
	let proxyClient = createTRPCProxyClient<T>({
		links: [httpBatchLink({ ...batchLinkOptions, url })]
	});
	return outerProxy(proxyClient, []) as unknown as storeCC<T>;
}

function browserPseudoClient(): any {
	return new Proxy(undefinedFn, { get: () => browserPseudoClient() });
}

function storePseudoClient(): any {
	return new Proxy(undefinedFn, {
		get: () => storePseudoClient(),
		apply: () => writable({ error: false, response: undefined, loading: true })
	});
}
function outerProxy(callback: any, path: string[]) {
	const proxy: unknown = new Proxy(undefinedFn, {
		get(_obj, key) {
			if (typeof key !== 'string' || key === 'then') {
				return undefined;
			}
			return outerProxy(callback, [...path, key]);
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

export { browserClientCreate, storeClientCreate, loadClientCreate };
export type { EndpointReturnType };
