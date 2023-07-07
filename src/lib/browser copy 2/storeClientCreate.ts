import type { AnyRouter } from '@trpc/server';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import { writable, type Writable } from 'svelte/store';

import type { storeClientOpt, storeCC } from './types';
import type { storeResponseValue } from './storeClientCreate.types';

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

function outerProxy(callback: any, path: string[], options: storeClientOpt) {
	const proxy: unknown = new Proxy(noop, {
		get(_obj, key) {
			if (typeof key !== 'string') {
				return undefined;
			}
			return outerProxy(callback, [...path, key], options);
		},
		apply(_1, _2, args) {
			let endpoint = callback;
			let method: string = '';
			for (let i = 0, iLen = path.length; i < iLen - 1; i++) {
				endpoint = endpoint[path[i] as keyof typeof endpoint];
				method = path[i + 1];
			}
			return storeClientMethods[method as keyof typeof storeClientMethods]({
				endpoint,
				args,
				options,
				path: path.slice(0, -1)
			});
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

type callEndpointOpts = {
	endpoint: CallableFunction;
	args: any[];
	store: storeResponseValue<any>;
	options: storeClientOpt;
	path: string[];
};
function callEndpoint(opts: callEndpointOpts) {
	const { endpoint, args, store, options, path } = opts;

	endpoint(...args)
		.then(async (response: any) => {
			if (options?.interceptResponse) {
				response = await options.interceptResponse(response, [...path].slice(0, -1).join('.'));
			}
			store.set({ loading: false, response, error: false, success: true });
		})
		.catch(async (error: any) => {
			if (options?.interceptError) {
				error = await options.interceptError(error, [...path].slice(0, -1).join('.'));
			}
			store.set({ loading: false, error, success: false, response: undefined });
		});
}

const storeClientMethods = {
	$now: function (opts: Omit<callEndpointOpts, 'store'>) {
		const { endpoint, args, options } = opts;

		let store: storeResponseValue<unknown> = writable({
			response: undefined,
			loading: true,
			error: false,
			success: false
		});

		callEndpoint({ ...opts, store });

		return store;
	}
};

export { storeClientCreate };
