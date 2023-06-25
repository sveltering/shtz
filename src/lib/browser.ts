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
	storeResponseValue,
	EndpointReturnType
} from './browser.types';

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

function noop() {}

function browserPseudoClient(): any {
	return new Proxy(noop, { get: () => browserPseudoClient() });
}

function storePseudoClient(): any {
	return new Proxy(noop, {
		get: () => storePseudoClient(),
		apply: () => writable({ error: false, response: undefined, loading: true })
	});
}
function outerProxy(callback: any, path: string[]) {
	const proxy: unknown = new Proxy(noop, {
		get(_obj, key) {
			if (typeof key !== 'string') {
				return undefined;
			}
			return outerProxy(callback, [...path, key]);
		},
		apply(_1, _2, args) {
			let endpoint = callback;
			for (let i = 0, iLen = path.length; i < iLen; i++) {
				endpoint = endpoint[path[i] as keyof typeof endpoint];
			}
			let store: storeResponseValue<unknown> = writable({
				loading: true,
				error: false,
				success: false
			});
			endpoint(...args)
				.then((response: any) => {
					store.set({ loading: false, response, error: false, success: true });
				})
				.catch((message: any) => {
					store.set({ loading: false, error: true, message, success: false });
				});

			return store;
		}
	});

	return proxy;
}

export { browserClientCreate, storeClientCreate, loadClientCreate };
export type { EndpointReturnType };
