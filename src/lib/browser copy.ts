import { browser } from '$app/environment';
import type { LoadEvent } from '@sveltejs/kit';
import type { AnyRouter } from '@trpc/server';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';

type ArgumentTypes<F extends Function> = F extends (...args: infer A) => any ? A : never;

type ReplaceFunctionReturn<Fn> = Fn extends (...a: infer A) => Promise<infer R>
	? (...a: A) => Promise<R | undefined>
	: Fn;

type RecursiveReplaceFunctionReturns<Obj extends object> = {
	[Key in keyof Obj]: Obj[Key] extends Function
		? ReplaceFunctionReturn<Obj[Key]>
		: Obj[Key] extends { [Key2: string]: any }
		? RecursiveReplaceFunctionReturns<Obj[Key]>
		: Obj[Key];
};
export type EndpointReturnType<T extends (...args: any) => Promise<any>> = T extends (
	...args: any
) => Promise<infer R>
	? R
	: any;

interface ClientOptions_I {
	url: string;
	transformer?: ArgumentTypes<typeof createTRPCProxyClient>[0]['transformer'];
	batchLinkOptions?: Omit<ArgumentTypes<typeof httpBatchLink>[0], 'url'>;
}

export const browserClientCreate = function <T extends AnyRouter>(
	options: ClientOptions_I
): RecursiveReplaceFunctionReturns<ReturnType<typeof createTRPCProxyClient<T>>> {
	const { url, batchLinkOptions } = options;

	if (!browser) {
		return new Proxy({}, handlers) as unknown as any;
	}

	//@ts-ignore
	return createTRPCProxyClient<T>({
		links: [httpBatchLink({ ...batchLinkOptions, url })]
	});
};

interface LClientOptions_I extends ClientOptions_I {
	batchLinkOptions?: Omit<ArgumentTypes<typeof httpBatchLink>[0], 'url' | 'fetch'>;
}
export const loadClientCreate = function <T extends AnyRouter>(options: LClientOptions_I) {
	const { url, batchLinkOptions } = options;

	return function ({ fetch }: LoadEvent) {
		//@ts-ignore
		return createTRPCProxyClient<T>({
			links: [httpBatchLink({ ...batchLinkOptions, url, fetch })]
		});
	};
};

// https://stackoverflow.com/questions/44441259/determining-if-get-handler-in-proxy-object-is-handling-a-function-call
const handlers: any = {
	get: (target: any, name: any) => {
		const prop = target[name];
		return new Proxy(function () {
			return undefined;
		}, handlers);
	}
};
