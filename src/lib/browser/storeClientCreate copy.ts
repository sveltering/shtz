import type { AnyRouter } from '@trpc/server';
import { createTRPCProxyClient, httpBatchLink, type TRPCClientError } from '@trpc/client';
import { get, writable, type Writable } from 'svelte/store';

import type { ArgumentTypes, AsyncFunctionType, FunctionType } from '../types.js';
import type { storeClientOpt, storeCC } from './types.js';

import type {
	StoreOpts,
	AnyStoreOpts,
	$OnceStoreOpts,
	$ManyStoreOpts,
	$MultipleStoreOpts,
	AnyOnceStore,
	AnyManyStore,
	AnyMultipleStore,
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
			let method = '' as 'call' | '$once' | '$many' | '$multiple';
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
			const is$many = method === '$many';
			const is$multiple = method === '$multiple';
			const has$call = is$many || is$multiple;

			let prefillData = undefined;
			let prefillFn = undefined;
			let entryFn = undefined;
			let entrySuccessFn = undefined;
			let hasLoading = false;
			let hasRemove = false;
			let hasAbort = false;
			let hasAbortOnRemove = false;
			let beforeCallFn = undefined;
			let beforeRemoveInputFn = undefined;
			let beforeRemoveResponseFn = undefined;

			const storeOptArg = hasArguments ? args[0] : false;
			if (storeOptArg && has$call) {
				if (typeof storeOptArg === 'function') {
					if (is$multiple) {
						entryFn = storeOptArg;
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
					if (is$multiple) {
						hasLoading = !!storeOptArg?.loading;
						entryFn = storeOptArg?.entry;
						entrySuccessFn = storeOptArg?.entrySuccess;
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
				is$many,
				is$multiple,
				has$call,

				prefillData,
				prefillFn,
				entryFn,
				entrySuccessFn,
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
		const _tracker: CallTracker = {} as CallTracker;
		const responseInner = {
			_tracker,
			data: undefined,
			loading: true,
			error: false,
			success: false
		};
		_tracker.responseInner = responseInner;
		const store: AnyOnceStore = writable(responseInner) as AnyOnceStore;
		callEndpoint({ store, opts, endpointArgs: opts.args, _tracker });
		return store;
	},
	$many: function (opts: $ManyStoreOpts) {
		const responseInner = {
			data: undefined,
			loading: false,
			error: false,
			success: false,
			call: (...endpointArgs: any[]) => {
				const _tracker: CallTracker = {} as CallTracker;
				//@ts-ignore
				_tracker.key = generateKey();
				_tracker.responseInner = responseInner;
				responseInner._tracker = _tracker;
				callEndpoint({ store, opts, endpointArgs, _tracker });
			}
		};
		const store: AnyManyStore = writable(responseInner) as AnyManyStore;
		handlePrefill(store, opts);
		return store;
	},
	$multiple: function (opts: $MultipleStoreOpts) {
		const { hasLoading } = opts;
		const store: AnyMultipleStore = writable({
			...(hasLoading ? { loading: false } : {}),
			responses: [],
			call: (...endpointArgs: any[]) => {
				const _tracker: CallTracker = {} as CallTracker;
				const responseInner = {
					_tracker,
					loading: true,
					success: false,
					error: false,
					data: undefined
				};
				_tracker.responseInner = responseInner;
				callEndpoint({ store, opts, endpointArgs, _tracker });
			}
		});
		handlePrefill(store, opts);
		return store;
	}
};

function handlePrefill(store: AnyStore, opts: AnyStoreOpts) {
	const { prefillData, prefillFn, is$many, is$multiple } = opts;
	if (!prefillData && !prefillFn) {
		return;
	}
	if (is$many) {
		const _tracker: CallTracker = {} as CallTracker;
		const responseInner = {
			_tracker,
			data: undefined,
			loading: false,
			error: false,
			success: false,
			call: (...endpointArgs: any[]) => {
				callEndpoint({ store, opts, endpointArgs, _tracker });
			}
		};
		_tracker.responseInner = responseInner;

		if (prefillData) {
			callEndpoint({
				store,
				opts,
				endpointArgs: [],
				_tracker,
				prefillHandle: async function () {
					return prefillData;
				}
			});
		} //
		else if (prefillFn) {
			callEndpoint({
				store,
				opts,
				endpointArgs: [],
				_tracker,
				prefillHandle: callAsync(prefillFn)
			});
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

type CallEndpointOpts = {
	store: AnyStore;
	opts: AnyStoreOpts;
	endpointArgs: any[];
	prefillHandle?: AsyncFunctionType;
	_tracker: CallTracker;
};

function callEndpoint(o: CallEndpointOpts) {
	const { store, opts, endpointArgs, prefillHandle, _tracker } = o;
	const {
		// method,
		endpoint,
		// args,
		// dotPath,
		is$once,
		is$many,
		is$multiple,
		has$call,

		// prefillData,
		// prefillFn,
		entryFn,
		entrySuccessFn,
		hasLoading,
		hasRemove,
		hasAbort,
		hasAbortOnRemove,
		//beforeRemoveFn, used in removeCallFn
		beforeCallFn
	} = opts;

	if (is$once) {
		endpoint(...endpointArgs)
			.then(endpointSuccess({ store, opts, _tracker }))
			.catch(endpointError({ store, opts, _tracker }));
		return;
	}

	// update and multiple methods use .call()
	if (_tracker && has$call) {
		const responseInner = _tracker.responseInner;

		responseInner.loading = true;

		if (hasAbort || hasAbortOnRemove) {
			_tracker.abortController = new AbortController();
			endpointArgs[0] = endpointArgs?.[0];
			endpointArgs[1] = endpointArgs.hasOwnProperty(1) ? endpointArgs[1] : {};
			endpointArgs[1].signal = _tracker.abortController.signal;
		}
		if (hasAbort) {
			responseInner.aborted = false;
			responseInner.abort = abortCallFn({ store, opts, _tracker, fromRemove: false });
		}
		if (hasRemove) {
			responseInner.remove = removeCallFn({ store, opts, _tracker, input: endpointArgs?.[0] });
		}

		if (is$many) {
			store.set(responseInner as any);
		} // is$multiple
		else {
			if (hasLoading) {
				const storeInner = get(store as any) as any;
				storeInner.loading = true;
				storeInner.set(storeInner);
			}
		}
	}

	if (prefillHandle) {
		prefillHandle()
			.then(endpointSuccess({ store, opts, _tracker }))
			.catch(endpointError({ store, opts, _tracker }));
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
					.then(endpointSuccess({ store, opts, _tracker }))
					.catch(endpointError({ store, opts, _tracker }));
			})
			.catch(endpointError({ store, opts, _tracker }));
	} //
	else {
		endpoint(...endpointArgs)
			.then(endpointSuccess({ store, opts, _tracker }))
			.catch(endpointError({ store, opts, _tracker }));
	}
}

type RemoveCallFnOpts = {
	store: AnyStore;
	opts: AnyStoreOpts;
	_tracker: CallTracker;
	data?: any;
	input?: any;
};
function removeCallFn(o: RemoveCallFnOpts) {
	return async function () {
		const { store, opts, _tracker, data, input } = o;
		const { is$many, beforeRemoveInputFn, beforeRemoveResponseFn, hasAbortOnRemove } = opts;
		const responseInner = _tracker.responseInner;

		let remove = true;
		let newResponse: any = {};

		if ((responseInner.success || responseInner.error) && beforeRemoveResponseFn) {
			const continueToRemove = await beforeRemoveResponseFn(data, function (replaceResponse) {
				newResponse.value = replaceResponse;
			});
			if (continueToRemove === true) {
				if (hasAbortOnRemove) {
					abortCallFn({ store, opts, _tracker, fromRemove: true })();
				}
			} else {
				remove = false;
			}
		} //
		else if (!(responseInner.success || responseInner.error) && beforeRemoveInputFn) {
			const continueRemove = await beforeRemoveInputFn(input);
			if (continueRemove === true) {
				if (hasAbortOnRemove) {
					abortCallFn({ store, opts, _tracker, fromRemove: true })();
				}
			} else {
				remove = false;
			}
		} //
		else {
			if (hasAbortOnRemove) {
				abortCallFn({ store, opts, _tracker, fromRemove: true })();
			}
		}

		if (remove) {
			console.log('REMOVED');
			_tracker.skip = true;
			console.log(_tracker);
		}

		if (!remove && !newResponse?.hasOwnProperty('value')) {
			return;
		}

		if (!remove && newResponse.hasOwnProperty('value')) {
			if (is$many) {
				responseInner.data = newResponse.value;
				store.set(responseInner);
			} // MULTIPLE UPDATE STORE
			else {
			}
		}
		if (!remove) {
			return;
		}

		if (is$many) {
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

type AbortCallFnOpts = {
	store: AnyStore;
	opts: AnyStoreOpts;
	_tracker: CallTracker;
	fromRemove: boolean;
};
function abortCallFn(o: AbortCallFnOpts) {
	return function () {
		const { store, opts, _tracker, fromRemove } = o;

		if (!_tracker?.abortController) {
			return;
		}

		const { is$many } = opts;

		_tracker.abortController?.abort();
		delete _tracker.abortController;
		_tracker.skip = true;

		if (is$many) {
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

type EndpointSuccessError = { store: AnyStore; opts: AnyStoreOpts; _tracker: CallTracker };
function endpointSuccess(o: EndpointSuccessError) {
	return async function (data: any) {
		const { store, opts, _tracker } = o;
		await endpointReponse({ isSuccess: true, isError: false, store, opts, _tracker, data });
	};
}
function endpointError(o: EndpointSuccessError) {
	return async function (error: any) {
		const { store, opts, _tracker } = o;
		await endpointReponse({ isSuccess: false, isError: true, store, opts, _tracker, error });
	};
}

type EndpointSuccessOpts = {
	isSuccess: true;
	isError: false;
	store: AnyStore;
	opts: AnyStoreOpts;
	_tracker: CallTracker;
	data: any;
	error?: undefined;
};
type EndpointErrorOpts = {
	isSuccess: false;
	isError: true;
	store: AnyStore;
	opts: AnyStoreOpts;
	_tracker: CallTracker;
	data?: undefined;
	error: Error;
};
type EndpointResponseOpts = {
	isSuccess: boolean;
	isError: boolean;
	store: AnyStore;
	opts: AnyStoreOpts;
	_tracker: CallTracker;
	data?: any;
	error?: Error;
};

async function endpointReponse(o: EndpointSuccessOpts): Promise<void>;
async function endpointReponse(o: EndpointErrorOpts): Promise<void>;
async function endpointReponse(o: EndpointResponseOpts): Promise<void> {
	const { isSuccess, isError, store, opts, _tracker, data, error } = o;
	const { is$once, is$many, has$call, hasRemove } = opts;

	if (is$once) {
		const storeInner = get(store as any) as any;
		Object.assign(storeInner, {
			loading: false,
			success: isSuccess,
			error: isError ? error : false,
			data: isSuccess ? data : undefined
		});
		store.set(storeInner as any);
		return;
	}

	console.log('RESPONSE IN');
	console.log(_tracker);
	if (_tracker?.skip) {
		_tracker.skip = false;
		return;
	}

	if (_tracker && has$call) {
		const storeInner = get(store as any) as any;
		delete storeInner?.abort;
		Object.assign(storeInner, {
			loading: false,
			success: isSuccess,
			error: isError ? error : false,
			data: isSuccess ? data : undefined
		});
		if (hasRemove) {
			storeInner.remove = removeCallFn({ store, opts, _tracker, data });
		}
		store.set(storeInner as any);
		return;
	}

	return;
}

export { storeClientCreate };
