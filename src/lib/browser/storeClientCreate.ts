import type { AnyRouter } from '@trpc/server';
import { createTRPCProxyClient, httpBatchLink, type TRPCClientError } from '@trpc/client';
import { get, writable, type Writable } from 'svelte/store';

import type { ArgumentTypes, AsyncFunctionType, FunctionType } from '../types.js';
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
	CallTracker,
	AnyStore
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
		apply: (_1, _2, args) => {
			return writable({});
		}
	});
}

const generateKey = () => Math.random().toString(36).substring(2, 12);

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
			const is$arrayType = is$array || is$entry;

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
			let beforeCallFn = undefined;
			let beforeRemoveInputFn = undefined;
			let beforeRemoveResponseFn = undefined;

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
					beforeRemoveInputFn = storeOptArg?.beforeRemoveInput;
					beforeRemoveResponseFn = storeOptArg?.beforeRemoveResponse;
					beforeCallFn = storeOptArg?.beforeCall;

					const prefillType = typeof storeOptArg?.prefill;
					if (prefillType === 'function') {
						prefillFn = storeOptArg.prefill;
					} //
					else if (typeof prefillType !== 'undefined') {
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

			const storeOpts: StoreOpts = {
				method,
				endpoint,
				args,
				dotPath,
				is$once,
				is$update,
				is$array,
				is$entry,
				is$object,
				is$multiple,
				is$arrayType,

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
				beforeCallFn,
				beforeRemoveInputFn,
				beforeRemoveResponseFn
			};

			return storeClientMethods[method](storeOpts as any);
		}
	});
	return proxy;
}
const storeClientMethods = {
	$once: function (opts: $OnceStoreOpts) {
		const store: AnyOnceStore = writable({
			data: undefined,
			loading: true,
			error: false,
			success: false
		});
		callEndpoint(store, opts, opts.args, false);
		return store;
	},
	$update: function (opts: $UpdateStoreOpts) {
		const store: AnyUpdateStore = writable({
			data: undefined,
			loading: false,
			error: false,
			success: false,
			call: (...endpointArgs: any[]) => {
				callEndpoint(store, opts, endpointArgs, false);
			}
		});
		handlePrefill(store, opts);
		return store;
	},
	$array: function (opts: $ArrayStoreOpts) {
		const { hasLoading } = opts;
		const store: AnyArrayStore = writable({
			...(hasLoading ? { loading: false } : {}),
			responses: [],
			call: (...endpointArgs: any[]) => {
				callEndpoint(store, opts, endpointArgs, false);
			}
		});
		handlePrefill(store, opts);
		return store;
	},
	$entry: function (opts: $EntryStoreOpts) {
		const { hasLoading } = opts;
		const store: AnyEntryStore = writable({
			...(hasLoading ? { loading: false } : {}),
			responses: [],
			call: (...endpointArgs: any[]) => {
				callEndpoint(store, opts, endpointArgs, false);
			}
		});
		handlePrefill(store, opts);
		return store;
	},
	$object: function (opts: $ObjectStoreOpts) {
		const { hasLoading, prefillData } = opts;
		const store: AnyObjectStore = writable({
			...(hasLoading ? { loading: false } : {}),
			responses: {},
			call: (...endpointArgs: any[]) => {
				callEndpoint(store, opts, endpointArgs, false);
			}
		});
		handlePrefill(store, opts);
		return store;
	}
};

function handlePrefill(store: AnyStore, opts: AnyStoreOpts) {
	const { prefillData, prefillFn, is$update, is$multiple } = opts;
	if (!prefillData && !prefillFn) {
		return;
	}
	if (is$update) {
		if (prefillData) {
			callEndpoint(store, opts, [], async function () {
				return prefillData;
			});
		} else if (prefillFn) {
			callEndpoint(store, opts, [], callAsync(prefillFn));
		}
	}
}

const callAsync = function <Fn extends FunctionType>(fn: FunctionType) {
	return async function (...args: ArgumentTypes<Fn>) {
		try {
			return await fn(...args);
		} catch (e) {
			throw e;
		}
	};
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

function callEndpoint(
	store: AnyStore,
	opts: AnyStoreOpts,
	endpointArgs: any[],
	prefillHandle: false | AsyncFunctionType
) {
	const {
		// method,
		endpoint,
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
		//beforeRemoveFn, used in removeCallFn
		beforeCallFn
	} = opts;

	const _tracker: CallTracker = {
		index: 0,
		skip: false
	};

	// update and multiple methods use .call()
	if (is$update || is$multiple) {
		const responseInner = is$update ? (get(store as any) as any) : {};

		responseInner._tracker = _tracker;
		_tracker.response = responseInner;

		responseInner.loading = true;

		if (hasAbort || hasAbortOnRemove) {
			_tracker.abortController = new AbortController();
			endpointArgs[0] = endpointArgs?.[0];
			endpointArgs[1] = endpointArgs.hasOwnProperty(1) ? endpointArgs[1] : {};
			endpointArgs[1].signal = _tracker.abortController.signal;
		}
		if (hasAbort) {
			responseInner.aborted = false;
			responseInner.abort = abortCallFn(store, opts, _tracker, false);
		}
		if (hasRemove) {
			responseInner.remove = removeCallFn(store, opts, _tracker, undefined, endpointArgs?.[0]);
		}

		if (is$update) {
			store.set(responseInner as any);
		} //
		else {
			const storeInner = get(store as any) as any;
			if (hasLoading) {
				storeInner.loading = true;
			}
			Object.assign(responseInner, {
				loading: true,
				success: false,
				error: false,
				data: undefined
			});
			// Add multiple to store
			// store.set(storeInner as any);
		}
	}

	if (prefillHandle) {
		prefillHandle()
			.then(endpointSuccess(store, opts, _tracker))
			.catch(endpointError(store, opts, _tracker));
	} //
	else if (beforeCallFn) {
		callAsync(beforeCallFn)(endpointArgs?.[0], function (newInput: any) {
			endpointArgs[0] = newInput;
		})
			.then(function (continueCall: boolean | void) {
				if (continueCall === false) {
					return;
				}
				endpoint(...endpointArgs)
					.then(endpointSuccess(store, opts, _tracker))
					.catch(endpointError(store, opts, _tracker));
			})
			.catch(endpointError(store, opts, _tracker));
	} //
	else {
		endpoint(...endpointArgs)
			.then(endpointSuccess(store, opts, _tracker))
			.catch(endpointError(store, opts, _tracker));
	}
}

function removeCallFn(
	store: AnyStore,
	opts: AnyStoreOpts,
	_tracker: CallTracker,
	response: any,
	input?: any
) {
	return async function () {
		const { is$update, beforeRemoveInputFn, beforeRemoveResponseFn, hasAbortOnRemove } = opts;
		const responseInner = _tracker.response;

		let remove = true;
		let newResponse: any = {};

		if ((responseInner.success || responseInner.error) && beforeRemoveResponseFn) {
			const continueToRemove = await beforeRemoveResponseFn(response, function (replaceResponse) {
				newResponse.value = replaceResponse;
			});
			if (continueToRemove === true) {
				if (hasAbortOnRemove) {
					abortCallFn(store, opts, _tracker, true)();
				}
			} else {
				remove = false;
			}
		} //
		else if (!(responseInner.success || responseInner.error) && beforeRemoveInputFn) {
			const continueRemove = await beforeRemoveInputFn(input);
			if (continueRemove === true) {
				if (hasAbortOnRemove) {
					abortCallFn(store, opts, _tracker, true)();
				}
			} else {
				remove = false;
			}
		} //
		else {
			if (hasAbortOnRemove) {
				abortCallFn(store, opts, _tracker, true)();
			}
		}

		if (!remove && !newResponse?.hasOwnProperty('value')) {
			return;
		}

		if (!remove && newResponse.hasOwnProperty('value')) {
			if (is$update) {
				responseInner.data = newResponse.value;
				store.set(responseInner);
			} // MULTIPLE UPDATE STORE
			else {
			}
		}

		if (remove) {
			_tracker.skip = true;
		} else {
			return;
		}

		if (is$update) {
			Object.assign(responseInner, {
				loading: false,
				success: false,
				error: false,
				data: undefined
			});
		} // REMOVE FOR MULTIPLE RE-INDEX ARRAYS, CHECK FOR LOADING
		else {
		}
		store.set(responseInner as any);
	};
}

function abortCallFn(
	store: AnyStore,
	opts: AnyStoreOpts,
	_tracker: CallTracker,
	fromRemove: boolean
) {
	return function () {
		if (!_tracker?.abortController) {
			return;
		}

		const { is$update } = opts;

		_tracker.abortController?.abort();
		delete _tracker.abortController;
		_tracker.skip = true;

		if (is$update) {
			const storeInner = get(store as any) as any;
			Object.assign(storeInner, {
				loading: false,
				success: false,
				error: false,
				data: undefined,
				aborted: true
			});
			store.set(storeInner as any);
			return;
		}
		if (fromRemove) {
			return;
		}

		// ABORT FOR MULTIPLE AND CHECK FOR LOADING IF NOT FROM REMOVE
	};
}

function endpointSuccess(store: AnyStore, opts: AnyStoreOpts, _tracker: CallTracker) {
	return async function (data: any) {
		await endpointReponse(true, store, opts, _tracker, data);
	};
}
function endpointError(store: AnyStore, opts: AnyStoreOpts, _tracker: CallTracker) {
	return async function (error: any) {
		await endpointReponse(false, store, opts, _tracker, error);
	};
}

async function endpointReponse(
	success: true,
	store: AnyStore,
	opts: AnyStoreOpts,
	_tracker: CallTracker,
	data: any
): Promise<void>;
async function endpointReponse(
	success: false,
	store: AnyStore,
	opts: AnyStoreOpts,
	_tracker: CallTracker,
	data: Error
): Promise<void>;
async function endpointReponse(
	success: boolean,
	store: AnyStore,
	opts: AnyStoreOpts,
	_tracker: CallTracker,
	data: any | Error
): Promise<void> {
	if (_tracker.skip) {
		_tracker.skip = false;
		return;
	}
	const { is$once, is$update, hasRemove } = opts;

	if (is$once || is$update) {
		const storeInner = get(store as any) as any;
		delete storeInner?.abort;
		Object.assign(storeInner, {
			loading: false,
			success: success,
			error: success ? false : data,
			data: success ? data : undefined
		});
		if (hasRemove) {
			storeInner.remove = removeCallFn(store, opts, _tracker, data);
		}
		store.set(storeInner as any);
		return;
	}

	return;
}

export { storeClientCreate };
