import type { AnyRouter } from '@trpc/server';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import { get, writable, type Writable } from 'svelte/store';

import type { storeClientOpt, storeCC } from './types';
import type { $onceStore, $revisableStore, $multipleStore } from './storeClientCreate.types';

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

			const hasArguments = !!args.length;

			const is$once = method === '$once';
			const is$revisable = method === '$revisable';
			const is$multiple = method === '$multiple';

			const is$multipleObject =
				is$multiple &&
				hasArguments &&
				(typeof args[0] === 'function' || args[0]?.hasOwnProperty('key'));

			const is$multipleArray = !is$multipleObject && !args?.[0]?.hasOwnProperty('entry');
			const is$multipleEntriesArray = !is$multipleObject && !!args?.[0]?.hasOwnProperty('entry');

			const $multipleHasLoading = is$multiple && hasArguments && args?.[0]?.loading === true;
			const $multipleHasRemove = is$multiple && hasArguments && args?.[0]?.remove === true;

			return storeClientMethods[method as keyof typeof storeClientMethods]({
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
				$multipleHasLoading,
				$multipleHasRemove
			} satisfies $methodOpts);
		}
	});

	return proxy;
}

function noop() {}
function storePseudoClient(path: string[] = []): any {
	return new Proxy(noop, {
		get(_obj, key) {
			if (typeof key !== 'string') {
				return undefined;
			}
			return storePseudoClient([...path, key]);
		},
		apply: (_1, _2, args) => {
			const method = path[path.length - 1];
			const hasArguments = !!args.length;
			const is$multiple = method === '$multiple';
			if (is$multiple) {
				const is$multipleObject =
					hasArguments && (typeof args[0] === 'function' || args[0]?.hasOwnProperty('key'));
				const $multipleHasLoading = is$multiple && hasArguments && args?.[0]?.loading === true;
				return writable({
					...($multipleHasLoading ? { loading: true } : {}),
					loading: true,
					responses: is$multipleObject ? {} : [],
					call: () => undefined
				});
			}
			return writable({
				loading: true,
				success: false,
				error: false,
				response: undefined,
				call: () => undefined
			});
		}
	});
}

type $methodOpts = {
	method: string;
	endpoint: CallableFunction;
	args: any[];
	options: storeClientOpt;
	path: string[];
	is$once: boolean;
	is$revisable: boolean;
	is$multiple: boolean;
	is$multipleArray: boolean;
	is$multipleEntriesArray: boolean;
	is$multipleObject: boolean;
	$multipleHasLoading: boolean;
	$multipleHasRemove: boolean;
};
type callEndpointOpts = $methodOpts & {
	endpointArgs: any[];
	store: $onceStore<any> | $revisableStore<any, any[]> | $multipleStore<any, any[], any>;
};
function callEndpoint(opts: callEndpointOpts) {
	const {
		endpoint,
		args,
		options,
		path,
		endpointArgs,
		store,
		is$once,
		is$revisable,
		is$multiple,
		is$multipleArray,
		is$multipleEntriesArray,
		is$multipleObject
	} = opts;

	if (is$revisable) {
		let storeInner = get(store as any) as any;
		storeInner = {
			response: undefined,
			loading: true,
			error: false,
			success: false,
			call: storeInner.call
		};
		store.set(storeInner);
	}
	let index$multiple: string | number;
	if (is$multiple) {
		let storeInner = get(store as any) as any;
		storeInner.loading = true;
		if (is$multipleArray) {
			storeInner.responses.push({
				response: undefined,
				loading: true,
				error: false,
				success: false
			});
			index$multiple = storeInner.responses.length - 1;
		} //
		else if (is$multipleObject) {
			index$multiple = args[0](endpointArgs[0]);
			storeInner.responses[index$multiple] = {
				response: undefined,
				loading: true,
				error: false,
				success: false
			};
		}
		store.set(storeInner);
	}
	endpoint(...endpointArgs)
		.then(async (response: any) => {
			if (options?.interceptResponse) {
				response = await options.interceptResponse(response, [...path].slice(0, -1).join('.'));
			}

			let newStoreValue: any = {};

			if (is$once) {
				newStoreValue = { loading: false, response, error: false, success: true };
			} //
			else if (is$revisable) {
				newStoreValue = { loading: false, response, error: false, success: true };
				newStoreValue.call = (get(store as Writable<any>) as any).call;
			} //
			else if (is$multiple) {
				newStoreValue = get(store as Writable<any>) as any;
				newStoreValue.responses[index$multiple] = {
					loading: false,
					response,
					error: false,
					success: true
				};
				let allResponses = newStoreValue.responses;
				let loading = false;
				for (let key in allResponses) {
					if (allResponses[key].loading) {
						loading = true;
						break;
					}
				}
				newStoreValue.loading = loading;
			}
			store.set(newStoreValue as any);
		})
		.catch(async (error: any) => {
			if (options?.interceptError) {
				error = await options.interceptError(error, [...path].slice(0, -1).join('.'));
			}

			let newStoreValue: any = {};

			if (is$once) {
				newStoreValue = { loading: false, error, success: false, response: undefined };
			} //
			else if (is$revisable) {
				newStoreValue = { loading: false, error, success: false, response: undefined };
				newStoreValue.call = (get(store as Writable<any>) as any).call;
			} //
			else if (is$multiple) {
				newStoreValue = get(store as Writable<any>) as any;
				newStoreValue.responses[index$multiple] = {
					loading: false,
					response: undefined,
					error,
					success: true
				};
				let allResponses = newStoreValue.responses;
				let loading = false;
				for (let key in allResponses) {
					if (allResponses[key].loading) {
						loading = true;
						break;
					}
				}
				newStoreValue.loading = loading;
			}
			store.set(newStoreValue as any);
		});
}

const storeClientMethods = {
	$once: function (opts: $methodOpts) {
		let store: $onceStore<unknown> = writable({
			response: undefined,
			loading: true,
			error: false,
			success: false
		});
		callEndpoint({ ...opts, endpointArgs: opts?.args, store });
		return store;
	},
	$revisable: function (opts: $methodOpts) {
		let store: $revisableStore<unknown, unknown[]> = writable({
			response: undefined,
			loading: true,
			error: false,
			success: false,
			call: (...endpointArgs: any[]) => {
				callEndpoint({ ...opts, endpointArgs, store });
			}
		});
		return store;
	},
	$multiple: function (opts: $methodOpts) {
		const { $multipleHasLoading, is$multipleObject } = opts;
		console.log(opts);
		let store: $multipleStore<any, any[], any> = writable({
			...($multipleHasLoading ? { loading: true } : {}),
			responses: is$multipleObject ? {} : [],
			call: (...endpointArgs: any[]) => {
				callEndpoint({ ...opts, endpointArgs, store });
			}
		});
		return store;
	}
};

export { storeClientCreate };
