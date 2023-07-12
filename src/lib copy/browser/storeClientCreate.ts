import type { AnyRouter } from '@trpc/server';
import { createTRPCProxyClient, httpBatchLink, type TRPCClientError } from '@trpc/client';
import { get, writable, type Writable } from 'svelte/store';

import type { storeClientOpt, storeCC } from './types';
import type {
	$onceStore,
	$revisableStore,
	$multipleStore,
	$methodOpts,
	callEndpointOpts,
	track$multipleOpts
} from './storeClientCreate.types';
import type { FunctionType } from './types';

function storeClientCreate<T extends AnyRouter>(options: storeClientOpt): storeCC<T> {
	const { url, batchLinkOptions } = options;

	if (typeof window === 'undefined') {
		return pseudoOuterProxy() as unknown as storeCC<T>;
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
			let endpoint: CallableFunction = callback;
			let method: string = '';
			for (let i = 0, iLen = path.length; i < iLen - 1; i++) {
				endpoint = endpoint[path[i] as keyof typeof endpoint];
				method = path[i + 1];
			}

			const hasArguments = !!args.length;

			const is$once = method === '$once';
			const is$revisable = method === '$revisable';
			const is$multiple = method === '$multiple';

			let is$multipleObject = false,
				is$multipleEntriesArray = false,
				is$multipleArray = false,
				$multipleGetKeyFn = undefined,
				$multipleGetEntryFn = undefined,
				$multipleHasLoading = false,
				$multipleHasRemove = false,
				$multipleHasAbort = false,
				$multipleHasAbortOnRemove = false;

			if (is$multiple) {
				is$multipleObject = hasArguments && !!args[0]?.hasOwnProperty?.('key');
				is$multipleEntriesArray =
					hasArguments && (typeof args[0] === 'function' || !!args[0]?.hasOwnProperty?.('entry'));
				is$multipleArray = !is$multipleObject && !is$multipleEntriesArray;

				$multipleGetKeyFn = is$multipleObject ? args[0]?.key : undefined;
				$multipleGetEntryFn = is$multipleEntriesArray ? args[0]?.entry || args[0] : undefined;

				$multipleHasLoading = hasArguments && args?.[0]?.loading === true;
				$multipleHasRemove = hasArguments && args?.[0]?.remove === true;
				$multipleHasAbort = hasArguments && args?.[0]?.abort === true;
				$multipleHasAbortOnRemove = hasArguments && args?.[0]?.abortOnRemove === true;
			}
			const methodOpts: $methodOpts = {
				method,
				endpoint,
				args,
				options,
				path: path.slice(0, is$multiple ? -2 : -1).join('.'),
				is$once,
				is$revisable,
				is$multiple,
				is$multipleArray,
				is$multipleEntriesArray,
				is$multipleObject,
				$multipleGetKeyFn,
				$multipleGetEntryFn,
				$multipleHasLoading,
				$multipleHasRemove,
				$multipleHasAbort,
				$multipleHasAbortOnRemove
			};

			return storeClientMethods[method as keyof typeof storeClientMethods](methodOpts as any);
		}
	});

	return proxy;
}

function noop() {}
function pseudoOuterProxy(path: string[] = []): any {
	return new Proxy(noop, {
		get(_obj, key) {
			if (typeof key !== 'string') {
				return undefined;
			}
			return pseudoOuterProxy([...path, key]);
		},
		apply: (_1, _2, args) => {
			const method = path[path.length - 1];
			const hasArguments = !!args.length;
			const is$multiple = method === '$multiple';
			if (is$multiple) {
				const is$multipleObject = is$multiple && hasArguments && !!args[0]?.hasOwnProperty?.('key');
				const $multipleHasLoading = is$multiple && hasArguments && args?.[0]?.loading === true;
				return writable({
					...($multipleHasLoading ? { loading: true } : {}),
					responses: is$multipleObject ? {} : [],
					call: noop
				});
			}
			return writable({
				loading: true,
				success: false,
				error: false,
				data: undefined,
				call: noop
			});
		}
	});
}

function callEndpoint(opts: callEndpointOpts) {
	const {
		endpoint,
		options,
		path,
		is$once,
		is$revisable,
		is$multiple,
		is$multipleArray,
		is$multipleEntriesArray,
		is$multipleObject,
		$multipleGetKeyFn,
		$multipleGetEntryFn,
		$multipleHasLoading,
		$multipleHasRemove,
		$multipleHasAbort,
		$multipleHasAbortOnRemove,
		endpointArgs,
		store
	} = opts;

	let $revisableCallFn: { call: FunctionType } = {} as any;

	let track$multiple: track$multipleOpts = {} as any;
	let $multipleRemoveFn: { remove: FunctionType } = {} as any;
	let $multipleAbortFn: { abort: FunctionType } = {} as any;
	let $multipleAborted: { aborted: boolean } = {} as any;

	if (is$revisable) {
		let storeInner = get(store as Writable<any>) as any;

		$revisableCallFn.call = storeInner.call;

		store.set({
			data: undefined,
			loading: true,
			error: false,
			success: false,
			...$revisableCallFn
		} as any);
	} //
	else if (is$multiple) {
		let storeInner = get(store as Writable<any>) as any;
		if ($multipleHasLoading) {
			storeInner.loading = true;
		}
		if ($multipleHasRemove) {
			$multipleRemoveFn = { remove: removeResponse(store, track$multiple, opts) };
		}
		if ($multipleHasAbort || $multipleHasAbortOnRemove) {
			track$multiple.abortController = new AbortController();
			endpointArgs[0] = endpointArgs?.[0];
			endpointArgs[1] = endpointArgs.hasOwnProperty(1) ? endpointArgs[1] : {};
			endpointArgs[1].signal = track$multiple.abortController.signal;
			$multipleAborted = {
				aborted: false
			};
			if ($multipleHasAbort) {
				$multipleAbortFn = {
					abort: abortResponse(store, track$multiple, opts, false)
				};
			}
		}
		if (is$multipleObject) {
			track$multiple.index = ($multipleGetKeyFn as FunctionType)(endpointArgs?.[0]);
		} //
		else {
			track$multiple.index = storeInner.responses.length;
		}
		const loadingResponse: any = {
			data: undefined,
			loading: true,
			error: false,
			success: false,
			...$multipleRemoveFn,
			...$multipleAbortFn,
			...$multipleAborted,
			track$multiple
		};
		if (is$multipleEntriesArray) {
			const entry = ($multipleGetEntryFn as FunctionType)(endpointArgs?.[0]);
			storeInner.responses.push([entry, loadingResponse]);
		} //
		else if (is$multipleArray) {
			storeInner.responses.push(loadingResponse);
		} //
		else if (is$multipleObject) {
			storeInner.responses[track$multiple.index] = loadingResponse;
		}
		store.set(storeInner);
	}

	endpoint(...endpointArgs)
		.then(async (data: any) => {
			if (track$multiple?.index === null) {
				return;
			}
			if (options?.interceptData) {
				data = await options.interceptData(data, path);
			}

			let storeInner: any = {};

			if (is$once) {
				storeInner = { loading: false, data, error: false, success: true };
			} //
			else if (is$revisable) {
				storeInner = { loading: false, data, error: false, success: true, ...$revisableCallFn };
			} //
			else if (is$multiple) {
				storeInner = get(store as Writable<any>) as any;

				const successResponse = {
					loading: false,
					data,
					error: false,
					success: true,
					...$multipleRemoveFn,
					...$multipleAborted,
					track$multiple
				};

				delete track$multiple.abortController;

				if (
					is$multipleEntriesArray &&
					storeInner.responses?.[track$multiple.index]?.hasOwnProperty?.(1)
				) {
					storeInner.responses[track$multiple.index][1] = successResponse;
				} //
				else if (storeInner.responses?.hasOwnProperty?.(track$multiple.index)) {
					storeInner.responses[track$multiple.index] = successResponse;
				}
			}
			store.set(storeInner as any);
			checkForLoading(store, opts);
		})
		.catch(async (error: TRPCClientError<any>) => {
			if (track$multiple?.index === null) {
				return;
			}
			if (error.cause?.name === 'ObservableAbortError') {
				return;
			}
			if (options?.interceptError) {
				error = (await options.interceptError(error, path)) as any;
			}
			let storeInner: any = {};

			if (is$once) {
				storeInner = { loading: false, data: undefined, error, success: false };
			} //
			else if (is$revisable) {
				storeInner = {
					loading: false,
					data: undefined,
					error,
					success: false,
					...$revisableCallFn
				};
			} //
			else if (is$multiple) {
				storeInner = get(store as Writable<any>) as any;

				const errorResponse = {
					loading: false,
					data: undefined,
					error,
					success: false,
					...$multipleRemoveFn,
					...$multipleAborted,
					track$multiple
				};

				delete track$multiple.abortController;

				if (
					is$multipleEntriesArray &&
					storeInner.responses?.[track$multiple.index]?.hasOwnProperty?.(1)
				) {
					storeInner.responses[track$multiple.index][1] = errorResponse;
				} //
				else if (storeInner.responses?.hasOwnProperty?.(track$multiple.index)) {
					storeInner.responses[track$multiple.index] = errorResponse;
				}
			}
			store.set(storeInner as any);
			checkForLoading(store, opts);
		});
}

function checkForLoading(store: Writable<any>, opts: callEndpointOpts) {
	if (opts.$multipleHasLoading) {
		const { is$multipleArray, is$multipleEntriesArray } = opts;
		const storeInner = get(store as Writable<any>) as any;
		const allResponses = storeInner.responses;
		let loading = false;

		if (is$multipleArray) {
			for (let i = 0, iLen = allResponses.length; i < iLen; i++) {
				if (allResponses[i].loading) {
					loading = true;
					break;
				}
			}
		} //
		else if (is$multipleEntriesArray) {
			for (let i = 0, iLen = allResponses.length; i < iLen; i++) {
				if (allResponses[i][1].loading) {
					loading = true;
					break;
				}
			}
		} //
		else {
			for (let key in allResponses) {
				if (allResponses[key].loading) {
					loading = true;
					break;
				}
			}
		}
		storeInner.loading = loading;
		store.set(storeInner);
	}
}

function abortResponse(
	store: Writable<any>,
	track$multiple: track$multipleOpts,
	opts: callEndpointOpts,
	fromRemove: boolean
) {
	return function () {
		if (track$multiple?.abortController) {
			track$multiple?.abortController?.abort?.();
			delete track$multiple.abortController;

			if (fromRemove) {
				return;
			}

			const { is$multipleEntriesArray } = opts;
			let storeInner = get(store) as any;

			if (
				is$multipleEntriesArray &&
				storeInner.responses?.[track$multiple.index]?.hasOwnProperty?.(1)
			) {
				storeInner.responses[track$multiple.index][1].aborted = true;
				storeInner.responses[track$multiple.index][1].loading = false;
				delete storeInner.responses[track$multiple.index][1]?.abort;
			} //
			else if (storeInner.responses?.hasOwnProperty?.(track$multiple.index)) {
				storeInner.responses[track$multiple.index].aborted = true;
				storeInner.responses[track$multiple.index].loading = false;
				delete storeInner.responses[track$multiple.index]?.abort;
			}

			store.set(storeInner);
			checkForLoading(store, opts);
		}
	};
}
function removeResponse(
	store: Writable<any>,
	track$multiple: track$multipleOpts,
	opts: callEndpointOpts
) {
	return function () {
		const { is$multipleObject, is$multipleEntriesArray, $multipleHasAbortOnRemove } = opts;

		if ($multipleHasAbortOnRemove) {
			abortResponse(store, track$multiple, opts, true)();
		}

		const storeInner = get(store) as any;

		const index = track$multiple.index;

		if (storeInner.responses.hasOwnProperty(index)) {
			if (is$multipleObject) {
				track$multiple.index = null as any;
				delete storeInner.responses[index];
			} //
			else {
				const allResponses = storeInner.responses;
				const itemRemoved = allResponses.splice(index, 1)?.[0];
				if (is$multipleEntriesArray) {
					itemRemoved[0] = null;
					itemRemoved[1].track$multiple.index = null;
					for (let i = 0, iLen = allResponses.length; i < iLen; i++) {
						const response = allResponses[i][1];
						response.track$multiple.index = i;
					}
				} //
				else {
					itemRemoved.track$multiple.index = null;
					for (let i = 0, iLen = allResponses.length; i < iLen; i++) {
						const response = allResponses[i];
						response.track$multiple.index = i;
					}
				}
			}
			store.set(storeInner);
			checkForLoading(store, opts);
		}
	};
}

const storeClientMethods = {
	$once: function (opts: callEndpointOpts) {
		const store: $onceStore<any> = writable({
			data: undefined,
			loading: true,
			error: false,
			success: false
		});
		callEndpoint({ ...opts, endpointArgs: opts?.args, store });
		return store;
	},
	$revisable: function (opts: callEndpointOpts) {
		const store: $revisableStore<any, any[]> = writable({
			data: undefined,
			loading: false,
			error: false,
			success: false,
			call: (...endpointArgs: any[]) => {
				callEndpoint({ ...opts, endpointArgs, store });
			}
		});
		return store;
	},
	$multiple: function <Lb extends boolean, Rb extends boolean>(opts: callEndpointOpts) {
		const { $multipleHasLoading, is$multipleObject } = opts;
		const store: $multipleStore<any, any[], boolean, boolean, boolean> = writable({
			...($multipleHasLoading ? { loading: false } : {}),
			responses: is$multipleObject ? {} : [],
			call: (...endpointArgs: any[]) => {
				callEndpoint({ ...opts, endpointArgs, store });
			}
		});
		return store;
	}
};

export { storeClientCreate };
