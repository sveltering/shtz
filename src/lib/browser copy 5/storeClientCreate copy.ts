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
			return storeClientMethods[method as keyof typeof storeClientMethods]({
				method,
				endpoint,
				endpointArgs: [],
				args,
				options,
				path: path.slice(0, -1)
			});
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
			if (path[path.length - 1] === '$multiple') {
				return writable({
					loading: true,
					responses: args.length ? {} : [],
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

type callEndpointOpts = {
	method: string;
	endpoint: CallableFunction;
	args: any[];
	endpointArgs: any[];
	store: $onceStore<any> | $revisableStore<any, any[]> | $multipleStore<any, any[], any>;
	options: storeClientOpt;
	path: string[];
};
function callEndpoint(opts: callEndpointOpts) {
	return;
	const { endpoint, args, endpointArgs, store, options, path, method } = opts;

	const is$once = method === '$once';
	const is$revisable = method === '$revisable';
	const is$multiple = method === '$multiple';
	const is$multipleArray = is$multiple && !args.length;
	const is$multipleObject = is$multiple && !!args.length;

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

type methodOpts = Omit<callEndpointOpts, 'store'>;
const storeClientMethods = {
	$once: function (opts: methodOpts) {
		let store: $onceStore<unknown> = writable({
			response: undefined,
			loading: true,
			error: false,
			success: false
		});
		callEndpoint({ ...opts, endpointArgs: opts?.args, store });
		return store;
	},
	$revisable: function (opts: methodOpts) {
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
	$multiple: function (opts: methodOpts) {
		const hasLoading = opts.args.length && opts.args?.[0]?.loading === true;
		const responsesIsArray = opts.args.length === 0 ? true : !opts.args?.[0]?.hasOwnProperty('key');
		console.log(responsesIsArray);
		let store: $multipleStore<any, any[], any> = writable({
			...(hasLoading ? { loading: true } : {}),
			responses: responsesIsArray ? [] : {},
			call: (...endpointArgs: any[]) => {
				callEndpoint({ ...opts, endpointArgs, store });
			}
		});
		return store;
	}
};

export { storeClientCreate };
