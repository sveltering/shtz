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

function storeClientCreate<T extends AnyRouter, B extends boolean = false>(
	options: storeClientOpt<B>
): storeCC<T, false>;
function storeClientCreate<T extends AnyRouter, B extends boolean = true>(
	options: storeClientOpt<B>
): storeCC<T, true>;
function storeClientCreate<T extends AnyRouter, B extends boolean>(
	options: storeClientOpt<B>
): storeCC<T, B> {
	const { url, batchLinkOptions, always = false } = options;

	if (typeof window === 'undefined') {
		return storePseudoClient(always) as unknown as storeCC<T, B>;
	}

	return outerProxy(
		//@ts-ignore
		createTRPCProxyClient<T>({
			links: [httpBatchLink({ ...batchLinkOptions, url })]
		}),
		[],
		options
	) as unknown as storeCC<T, B>;
}

function noop() {}

function browserPseudoClient(): any {
	return new Proxy(noop, { get: () => browserPseudoClient() });
}

function storePseudoClient(always: boolean): any {
	if (always) {
		return new Proxy(noop, {
			get: () => storePseudoClient(always),
			apply: () =>
				writable({
					loading: true,
					error: false,
					success: false,
					response: undefined,
					message: undefined
				})
		});
	}
	return new Proxy(noop, {
		get: () => storePseudoClient(always),
		apply: () => writable({ loading: true, error: false, success: false })
	});
}
function outerProxy(callback: any, path: string[], options: any) {
	const proxy: unknown = new Proxy(noop, {
		get(_obj, key) {
			if (typeof key !== 'string') {
				return undefined;
			}
			return outerProxy(callback, [...path, key], options);
		},
		apply(_1, _2, args) {
			let endpoint = callback;
			for (let i = 0, iLen = path.length; i < iLen; i++) {
				endpoint = endpoint[path[i] as keyof typeof endpoint];
			}
			if (options?.always === true) {
				let store: storeResponseValue<unknown, true> = writable({
					loading: true,
					error: false,
					success: false,
					response: undefined,
					message: undefined
				});
				endpoint(...args)
					.then(async (response: any) => {
						if (options?.interceptResponse) {
							response = await options.interceptResponse(
								response,
								[...path].slice(0, -1).join('.')
							);
						}
						store.set({
							loading: false,
							response,
							error: false,
							success: true,
							message: undefined
						});
					})
					.catch(async (message: any) => {
						if (options?.interceptError) {
							message = await options.interceptError(message, [...path].slice(0, -1).join('.'));
						}
						store.set({
							loading: false,
							error: true,
							message,
							success: false,
							response: undefined
						});
					});

				return store;
			}

			let store: storeResponseValue<unknown, false> = writable({
				loading: true,
				error: false,
				success: false
			});
			endpoint(...args)
				.then(async (response: any) => {
					if (options?.interceptResponse) {
						response = await options.interceptResponse(response, [...path].slice(0, -1).join('.'));
					}
					store.set({ loading: false, response, error: false, success: true });
				})
				.catch(async (message: any) => {
					if (options?.interceptError) {
						message = await options.interceptError(message, [...path].slice(0, -1).join('.'));
					}
					store.set({ loading: false, error: true, message, success: false });
				});

			return store;
		}
	});

	return proxy;
}

export { browserClientCreate, storeClientCreate, loadClientCreate };
export type { EndpointReturnType };
