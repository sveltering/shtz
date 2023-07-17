import type { AnyRouter } from '@trpc/server';
import { createTRPCProxyClient, httpBatchLink, type TRPCClientError } from '@trpc/client';
import { get, writable, type Writable } from 'svelte/store';

import type { AsyncFunctionType } from '../types.js';
import type { storeClientOpt, storeCC } from './types.js';

import type {
	StoreOpts,
	AnyStoreOpts,
	$OnceStoreOpts,
	$UpdateStoreOpts,
	$ArrayStoreOpts,
	$EntryStoreOpts,
	$ObjectStoreOpts,
	AnyOnceStore,
	AnyUpdateStore,
	AnyArrayStore,
	AnyEntryStore,
	AnyObjectStore
} from './storeClientCreate.types.js';

function storeClientCreate<Router extends AnyRouter>(options: storeClientOpt): storeCC<Router> {
	const { url, batchLinkOptions, transformer } = options;

	if (typeof window === 'undefined') {
		return pseudoOuterProxy([]) as storeCC<Router>;
	}

	return outerProxy(
		createTRPCProxyClient<Router>({
			links: [httpBatchLink({ ...batchLinkOptions, url })],
			transformer: transformer
		}),
		[],
		options
	) as storeCC<Router>;
}

function noop() {}
function pseudoOuterProxy(path: string[]): any {
	return new Proxy(noop, {
		get(_obj, key) {
			if (typeof key !== 'string') {
				return undefined;
			}
			return pseudoOuterProxy([...path, key]);
		},
		apply: (_1, _2, args) => {}
	});
}

let StoreMap = new WeakMap();
function outerProxy(callback: any, path: string[], options: storeClientOpt): any {
	const proxy: unknown = new Proxy(noop, {
		get(_obj, key) {
			if (typeof key !== 'string') {
				return undefined;
			}
			return outerProxy(callback, [...path, key], options);
		},
		apply(_1, _2, args) {
			let method = '' as 'call' | '$once' | '$update' | '$array' | '$entry' | '$object';
			let endpoint: AsyncFunctionType = callback;
			for (let i = 0, iLen = path.length; i < iLen - 1; i++) {
				method = path[i + 1] as any;
				endpoint = endpoint[path[i] as keyof typeof endpoint];
			}

			if (method === 'call') {
				return endpoint(...args);
			}

			const dotPath = path.slice(0, -2).join('.');

			if (!(method in storeClientMethods)) {
				if (console?.warn) {
					console.warn(`"${method}" is not a valid store method for ${dotPath}`);
				}
				return;
			}

			const hasArguments = !!args.length;

			const is$once = method === '$once';
			const is$update = method === '$update';
			const is$array = method === '$array';
			const is$entry = method === '$entry';
			const is$object = method === '$object';
			const is$multiple = is$array || is$entry || is$object;

			let prefillData = undefined;
			let prefillFn = undefined;
			let entryFn = undefined;
			let entrySuccessFn = undefined;
			let keyFn = undefined;
			let keySuccessFn = undefined;
			let hasLoading = false;
			let hasRemove = false;
			let hasAbort = false;
			let hasAbortOnRemove = false;
			let beforeRemoveFn = undefined;
			let beforeAddFn = undefined;
			let endpointArgs = is$once && hasArguments ? args : [];

			const storeOptArg = hasArguments ? args[0] : false;
			if (storeOptArg && (is$update || is$multiple)) {
				hasRemove = !!storeOptArg?.remove;
				beforeAddFn = storeOptArg?.beforeAdd;
				beforeRemoveFn = storeOptArg?.beforeRemove;

				const prefillType = typeof storeOptArg?.prefill;
				if (prefillType === 'function') {
					prefillFn = storeOptArg.prefill;
				} //
				else if (prefillType !== 'undefined') {
					prefillData = storeOptArg.prefill;
				}
				if (is$entry) {
					entryFn = storeOptArg?.entry;
					entrySuccessFn = storeOptArg?.entrySuccess;
				}
				if (is$object) {
					keyFn = storeOptArg?.key;
					keySuccessFn = storeOptArg?.keySuccess;
				}
				if (is$multiple) {
					hasLoading = !!storeOptArg?.loading;
				}
				hasAbort = !!storeOptArg?.abort;
				if (storeOptArg?.abortOnRemove) {
					hasRemove = true;
					hasAbortOnRemove = true;
				}
			}

			const store = writable<any>();
			const storeOpts: StoreOpts = {
				store,
				method,
				endpoint,
				endpointArgs,
				args,
				dotPath,
				is$once,
				is$update,
				is$array,
				is$entry,
				is$object,
				is$multiple,

				prefillData,
				prefillFn,
				entryFn,
				entrySuccessFn,
				keyFn,
				keySuccessFn,
				hasLoading,
				hasRemove,
				hasAbort,
				hasAbortOnRemove,
				beforeRemoveFn,
				beforeAddFn
			};
			if (typeof window !== 'undefined') {
				StoreMap.set(store, storeOpts);
			}
			return storeClientMethods[method]([store, storeOpts as never]);
		}
	});
	return proxy;
}
const storeClientMethods = {
	$once: function ([store, opts]: [AnyOnceStore, $OnceStoreOpts]) {
		store.set({
			data: undefined,
			loading: true,
			error: false,
			success: false
		});
		callEndpoint(opts);
		return store;
	},
	$update: function ([store, opts]: [AnyUpdateStore, $UpdateStoreOpts]) {
		store.set({
			data: undefined,
			loading: false,
			error: false,
			success: false,
			call: (...endpointArgs: any[]) => {
				callEndpoint({ ...opts, endpointArgs });
			}
		});
		return store;
	},
	$array: function ([store, opts]: [AnyArrayStore, $ArrayStoreOpts]) {
		const { hasLoading } = opts;
		store.set({
			...(hasLoading ? { loading: false } : {}),
			responses: [],
			call: (...endpointArgs: any[]) => {
				callEndpoint({ ...opts, endpointArgs });
			}
		});
		return store;
	},
	$entry: function ([store, opts]: [AnyEntryStore, $EntryStoreOpts]) {
		const { hasLoading } = opts;
		store.set({
			...(hasLoading ? { loading: false } : {}),
			responses: [],
			call: (...endpointArgs: any[]) => {
				callEndpoint({ ...opts, endpointArgs });
			}
		});
		return store;
	},
	$object: function ([store, opts]: [AnyObjectStore, $ObjectStoreOpts]) {
		const { hasLoading } = opts;
		store.set({
			...(hasLoading ? { loading: false } : {}),
			responses: {},
			call: (...endpointArgs: any[]) => {
				callEndpoint({ ...opts, endpointArgs });
			}
		});
		return store;
	}
};

const is$once = (opts: AnyStoreOpts): opts is $OnceStoreOpts => {
	return opts.method === '$once';
};

function callEndpoint(opts: AnyStoreOpts) {
	const { store } = opts;
}

export { storeClientCreate };
