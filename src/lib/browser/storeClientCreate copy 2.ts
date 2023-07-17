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
	AnyObjectStore,
	CallTracker
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

const generateKey = () => Math.random().toString(36).substring(2, 12);
const beforeRemoveFnDefault = () => true;
const beforeCallFnDefault = () => true;
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

			let removed = false;
			let prefillData = undefined;
			let prefillFn = undefined;
			let entryFn = undefined;
			let entrySuccessFn = undefined;
			let keyFn = generateKey;
			let keySuccessFn = undefined;
			let hasLoading = false;
			let hasRemove = false;
			let hasAbort = false;
			let hasAbortOnRemove = false;
			let beforeRemoveFn = beforeRemoveFnDefault;
			let beforeCallFn = beforeCallFnDefault;
			let endpointArgs = is$once && hasArguments ? args : []; // only for once

			const storeOptArg = hasArguments ? args[0] : false;
			if (storeOptArg && (is$update || is$multiple)) {
				if (typeof storeOptArg === 'function') {
					if (is$entry) {
						entryFn = storeOptArg;
					} //
					else if (is$object) {
						keyFn = storeOptArg;
					}
				} //
				else {
					hasRemove = !!storeOptArg?.remove;
					beforeCallFn = storeOptArg?.beforeCall;
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
				beforeCallFn
			};
			if (typeof window !== 'undefined') {
				StoreMap.set(store, storeOpts);
			}
			return storeClientMethods[method](storeOpts as any);
		}
	});
	return proxy;
}
const storeClientMethods = {
	$once: function (opts: $OnceStoreOpts) {
		const { store } = opts;
		store.set({
			data: undefined,
			loading: true,
			error: false,
			success: false
		});
		callEndpoint(opts);
		return store;
	},
	$update: function (opts: $UpdateStoreOpts) {
		const { store } = opts;
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
	$array: function (opts: $ArrayStoreOpts) {
		const { store, hasLoading } = opts;
		store.set({
			...(hasLoading ? { loading: false } : {}),
			responses: [],
			call: (...endpointArgs: any[]) => {
				callEndpoint({ ...opts, endpointArgs });
			}
		});
		return store;
	},
	$entry: function (opts: $EntryStoreOpts) {
		const { store, hasLoading } = opts;
		store.set({
			...(hasLoading ? { loading: false } : {}),
			responses: [],
			call: (...endpointArgs: any[]) => {
				callEndpoint({ ...opts, endpointArgs });
			}
		});
		return store;
	},
	$object: function (opts: $ObjectStoreOpts) {
		const { store, hasLoading } = opts;
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

const is$onceOpts = (opts: AnyStoreOpts): opts is $OnceStoreOpts => opts.method === '$once';
const is$onceStore = (store: Writable<any>): store is AnyOnceStore => true;

const is$updateOpts = (opts: AnyStoreOpts): opts is $UpdateStoreOpts => opts.method === '$update';
const is$updateStore = (store: Writable<any>): store is AnyUpdateStore => true;

const is$arrayOpts = (opts: AnyStoreOpts): opts is $ArrayStoreOpts => opts.method === '$array';
const is$arrayStore = (store: Writable<any>): store is AnyArrayStore => true;

const is$entryOpts = (opts: AnyStoreOpts): opts is $EntryStoreOpts => opts.method === '$entry';
const is$entryStore = (store: Writable<any>): store is AnyEntryStore => true;

const is$objectOpts = (opts: AnyStoreOpts): opts is $ObjectStoreOpts => opts.method === '$object';
const is$objectStore = (store: Writable<any>): store is AnyObjectStore => true;

function callEndpoint(opts: AnyStoreOpts) {
	const {
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
		beforeCallFn
	} = opts;

	const callTracker: CallTracker = {
		skip: false
	};
	const input = is$once ? undefined : endpointArgs?.[0];

	if (is$updateOpts(opts) && is$updateStore(store)) {
		const storeInner = get(store);
		if (hasAbort || hasAbortOnRemove) {
			callTracker.abortController = new AbortController();
			endpointArgs[0] = endpointArgs?.[0];
			endpointArgs[1] = endpointArgs.hasOwnProperty(1) ? endpointArgs[1] : {};
			endpointArgs[1].signal = callTracker.abortController.signal;
		}
		if (hasAbort) {
			//@ts-ignore
			storeInner.abort = abortCall(opts, callTracker, false);
		}
		if (hasRemove) {
			//@ts-ignore
			storeInner.remove = async function () {
				const beforeRemove = await beforeRemoveFn(undefined, input);
				if (beforeRemove === true) {
					if (hasAbortOnRemove) {
						abortCall(opts, callTracker, true);
					}
					callTracker.skip = true;
				}
			};
		}
	}

	endpoint(...endpointArgs)
		.then(endpointSuccess(opts, callTracker))
		.catch(endpointError(opts, callTracker));
}

function abortCall(opts: AnyStoreOpts, callTracker: CallTracker, fromRemove: boolean) {
	return function () {
		if (!callTracker?.abortController) {
			return;
		}

		callTracker.abortController?.abort();
		delete callTracker.abortController;
		callTracker.skip = true;

		if (fromRemove) {
			return;
		}
	};
}

function endpointSuccess(opts: AnyStoreOpts, callTracker: CallTracker) {
	return async function (data: any) {
		await endpointReponse(true, opts, callTracker, data);
	};
}
function endpointError(opts: AnyStoreOpts, callTracker: CallTracker) {
	return async function (data: any) {
		await endpointReponse(false, opts, callTracker, data);
	};
}

async function endpointReponse(
	success: boolean,
	opts: AnyStoreOpts,
	callTracker: CallTracker,
	data: any
) {
	if (callTracker.skip) {
		callTracker.skip = false;
		return;
	}
}

export { storeClientCreate };
