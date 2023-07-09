import type { AnyRouter } from '@trpc/server';
import { createTRPCProxyClient, httpBatchLink, type TRPCClientError } from '@trpc/client';
import { get, writable, type Writable } from 'svelte/store';

import type { storeClientOpt, storeCC } from './types';
import type {
	$onceStore,
	$revisableStore,
	$multipleStore,
	$methodOpts,
	callEndpointOpts
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
				$multipleHasRemove = false;

			if (is$multiple) {
				is$multipleObject = hasArguments && !!args[0]?.hasOwnProperty?.('key');
				is$multipleEntriesArray =
					hasArguments && (typeof args[0] === 'function' || !!args[0]?.hasOwnProperty?.('entry'));
				is$multipleArray = !is$multipleObject && !is$multipleEntriesArray;

				$multipleGetKeyFn = is$multipleObject ? args[0]?.key : undefined;
				$multipleGetEntryFn = is$multipleEntriesArray ? args[0]?.entry || args[0] : undefined;

				$multipleHasLoading = hasArguments && args?.[0]?.loading === true;
				$multipleHasRemove = hasArguments && args?.[0]?.remove === true;
			}

			const returnObj: $methodOpts = {
				method,
				endpoint,
				args,
				options,
				path: path.slice(0, -1),
				is$once,
				is$revisable,
				is$multiple,
				is$multipleArray,
				is$multipleEntriesArray,
				is$multipleObject,
				$multipleGetKeyFn,
				$multipleGetEntryFn,
				$multipleHasLoading,
				$multipleHasRemove
			};

			return storeClientMethods[method as keyof typeof storeClientMethods](returnObj as any);
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
					call: () => undefined
				});
			}
			return writable({
				loading: true,
				success: false,
				error: false,
				data: undefined,
				call: () => undefined
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
		endpointArgs,
		store
	} = opts;

	let track$multiple: { index: string | number } = {} as any;
	let $multipleRemoveFn: { remove: FunctionType } | {} = {};

	if (is$revisable) {
		let storeInner = get(store as any) as any;
		storeInner = {
			data: undefined,
			loading: true,
			error: false,
			success: false,
			call: storeInner.call
		};
		store.set(storeInner);
	} //
	else if (is$multiple) {
		let storeInner = get(store as any) as any;

		if ($multipleHasLoading) {
			storeInner.loading = true;
		}
		if ($multipleHasRemove) {
			$multipleRemoveFn = { remove: removeResponse(store, track$multiple, is$multipleObject) };
		}

		if (is$multipleObject) {
			track$multiple.index = ($multipleGetKeyFn as FunctionType)(endpointArgs[0]);
		} //
		else {
			track$multiple.index = storeInner.responses.length;
		}
		const loadingResponse = {
			data: undefined,
			loading: true,
			error: false,
			success: false,
			...$multipleRemoveFn,
			track$multiple
		};
		if (is$multipleEntriesArray) {
			const entry = ($multipleGetEntryFn as FunctionType)(endpointArgs[0]);
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
			if (options?.interceptData) {
				data = await options.interceptData(data, [...path].slice(0, -1).join('.'));
			}

			let successResponse: any = {};

			if (is$once) {
				successResponse = { loading: false, data, error: false, success: true };
			} //
			else if (is$revisable) {
				successResponse = { loading: false, data, error: false, success: true };
				successResponse.call = (get(store as Writable<any>) as any).call;
			} //
			else if (is$multiple) {
				successResponse = get(store as Writable<any>) as any;

				const individualSuccessResponse = {
					loading: false,
					data,
					error: false,
					success: true,
					...$multipleRemoveFn,
					track$multiple
				};

				if (is$multipleEntriesArray) {
					successResponse.responses[track$multiple.index][1] = individualSuccessResponse;
				} //
				else {
					successResponse.responses[track$multiple.index] = individualSuccessResponse;
				}

				if ($multipleHasLoading) {
					let allResponses = successResponse.responses;
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
					successResponse.loading = loading;
				}
			}
			store.set(successResponse as any);
		})
		.catch(async (error: TRPCClientError<any>) => {
			if (options?.interceptError) {
				error = (await options.interceptError(error, [...path].slice(0, -1).join('.'))) as any;
			}

			let errorResponse: any = {};

			if (is$once) {
				errorResponse = { loading: false, data: undefined, error, success: false };
			} //
			else if (is$revisable) {
				errorResponse = { loading: false, data: undefined, error, success: false };
				errorResponse.call = (get(store as Writable<any>) as any).call;
			} //
			else if (is$multiple) {
				errorResponse = get(store as Writable<any>) as any;

				const individualErrorResponse = {
					loading: false,
					data: undefined,
					error,
					success: false,
					...$multipleRemoveFn,
					track$multiple
				};

				if (is$multipleEntriesArray) {
					errorResponse.responses[track$multiple.index][1] = individualErrorResponse;
				} //
				else {
					errorResponse.responses[track$multiple.index] = individualErrorResponse;
				}

				if ($multipleHasLoading) {
					let allResponses = errorResponse.responses;
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
					errorResponse.loading = loading;
				}
			}
			store.set(errorResponse as any);
		});
}

function removeResponse(
	from: Writable<any>,
	track$multiple: { index: number | string },
	isObject: boolean
) {
	return function () {
		let storeInner = get(from) as any;
		const index = track$multiple.index;

		if (isObject && storeInner.responses.hasOwnProperty(index)) {
			delete storeInner.responses[index];
		} //
		else if (!!storeInner.responses?.[index]) {
			let allResponses = storeInner.responses;
			const isEntry = Array.isArray(allResponses.splice(index, 1));
			if (isEntry) {
				for (let i = 0, iLen = allResponses.length; i < iLen; i++) {
					const response = allResponses[i][1];
					response.track$multiple.index = i;
					response.remove = removeResponse(from, response.track$multiple, isObject);
				}
			} //
			else {
				for (let i = 0, iLen = allResponses.length; i < iLen; i++) {
					const response = allResponses[i];
					response.track$multiple.index = i;
					response.remove = removeResponse(from, response.track$multiple, isObject);
				}
			}
		}
		from.set(storeInner);
	};
}

const storeClientMethods = {
	$once: function (opts: callEndpointOpts) {
		let store: $onceStore<any> = writable({
			data: undefined,
			loading: true,
			error: false,
			success: false
		});
		callEndpoint({ ...opts, endpointArgs: opts?.args, store });
		return store;
	},
	$revisable: function (opts: callEndpointOpts) {
		let store: $revisableStore<any, any[]> = writable({
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
		let store: $multipleStore<any, any[], boolean, boolean> = writable({
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
