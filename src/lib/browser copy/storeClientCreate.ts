import type { AnyRouter } from '@trpc/server';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import { writable } from 'svelte/store';

import type { storeClientOpt, storeCC } from './types';

function storeClientCreate<T extends AnyRouter>(options: storeClientOpt): storeCC<T> {
	const { url, batchLinkOptions } = options;

	if (typeof window === 'undefined') {
		return storePseudoClient() as unknown as storeCC<T>;
	}

	return outerProxy(
		//@ts-ignore
		createTRPCProxyClient<T>({
			links: [httpBatchLink({ ...batchLinkOptions, url })]
		}),
		[],
		options
	) as unknown as storeCC<T>;
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
			let methodName = path[path.length - 1];
		}
	});

	return proxy;
}

function noop() {}
function storePseudoClient(): any {
	return new Proxy(noop, {
		get: () => storePseudoClient(),
		apply: () => writable({ loading: true, error: false, success: false })
	});
}

export { storeClientCreate };
