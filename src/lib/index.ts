// Reexport your entry components here
import type { LoadEvent, RequestEvent } from '@sveltejs/kit';
import { initTRPC, type AnyRouter } from '@trpc/server';
import { resolveHTTPResponse } from '@trpc/server/http';
import type { HTTPResponse } from '@trpc/server/dist/http/internals/types';
import { createTRPCProxyClient, httpBatchLink, type HTTPHeaders } from '@trpc/client';
import { parse as parseURL } from 'url';

type keyValue = { [key: string]: any };
type asyncCallableFunction = () => Promise<any>;
type ArgumentTypes<F extends Function> = F extends (...args: infer A) => any ? A : never;
type SyncReturnType<T extends CallableFunction> = T extends (...args: any) => infer R ? R : any;
type createContextFn_T<T> = (event: RequestEvent) => Promise<T> | T;

interface TRPCOptions_I<T> {
	origin: string;
	bypassOrigin?: string;
	path: string;
	context: createContextFn_T<T>;
	beforeResolve?: (event: RequestEvent, pipe: keyValue) => any;
	resolveError?: (event: RequestEvent, pipe: keyValue) => any;
	beforeResponse?: (event: RequestEvent, pipe: keyValue, result: HTTPResponse) => any;
	resolveOptions?: ArgumentTypes<typeof resolveHTTPResponse>[0];
	locals?: 'always' | 'callable' | 'never';
	localsKey?: string;
}

export class TRPC<T extends object> {
	//OPTIONS
	options: TRPCOptions_I<T>;
	//OTHER
	pipe: keyValue = {};
	tRPCInner: SyncReturnType<SyncReturnType<typeof initTRPC.context<T>>['create']>;
	constructor(options: TRPCOptions_I<T>) {
		if (typeof window !== 'undefined') {
			throw new Error('new TRPC() should only be used within the server environment.');
		}
		this.options = { locals: 'always', localsKey: 'TRPC', ...options };
		this.tRPCInner = initTRPC.context<T>().create();
		return this;
	}

	get router() {
		return this.tRPCInner.router;
	}
	get middleware() {
		return this.tRPCInner.middleware;
	}
	get procedure() {
		return this.tRPCInner.procedure;
	}

	hook<R extends AnyRouter>(router: R) {
		const $this = this;
		const options = this.options;
		return async function (event: RequestEvent) {
			const localsKey = options.localsKey;
			const contextFnConsturctor = options.context.constructor.name;
			if (options.locals === 'always') {
				if (contextFnConsturctor === 'AsyncFunction') {
					//@ts-ignore
					event.locals[localsKey] = router.createCaller(await options.context(event));
				} else if (contextFnConsturctor === 'Function') {
					//@ts-ignore
					event.locals[localsKey] = router.createCaller(options.context(event));
				}
			} //
			else if (options.locals === 'callable') {
				if (contextFnConsturctor === 'AsyncFunction') {
					//@ts-ignore
					event.locals[localsKey] = async () => router.createCaller(await options.context(event));
				} else if (contextFnConsturctor === 'Function') {
					//@ts-ignore
					event.locals[localsKey] = () => router.createCaller(options.context(event));
				}
			}

			const URL = event.url;
			const pathName = URL.pathname;
			if (!pathName.startsWith(options.path)) {
				return false;
			}
			const request = event.request as Request;

			let result;

			if (options?.beforeResolve) {
				await options.beforeResolve?.(event, $this.pipe);
			}

			if (options?.resolveError) {
				const errorMessage = await options.resolveError?.(event, $this.pipe);
				if (errorMessage) {
					const path = parseURL(request.url)
						.pathname?.replace(options.path + '/', '')
						.replaceAll('/', '.');
					result = {
						body: `[{"error":{"message":"${errorMessage}","code":-32600,"data":{"code":"BAD_REQUEST","httpStatus":400,"path":"${path}"}}}]`,
						status: 400,
						headers: { 'Content-Type': 'application/json' }
					};
				}
			}

			if (!result) {
				result = await resolveHTTPResponse({
					createContext: async () => await options.context(event),
					path: pathName.substring(options.path.length + 1),
					req: {
						body: await request.text(),
						headers: request.headers as unknown as HTTPHeaders,
						method: request.method,
						query: URL.searchParams
					},
					router,
					...options?.resolveOptions
				});
			}

			if (!result?.headers) {
				result.headers = {};
			}

			if (options?.beforeResponse) {
				await options?.beforeResponse(event, $this.pipe, result);
			}

			return new Response(result.body, {
				headers: result.headers as HeadersInit,
				status: result.status
			});
		};
	}

	handleFetch() {
		const options = this.options;
		if (!options.bypassOrigin) {
			throw new Error('No bypass origin set, are you sure you need to handle fetch?');
		}
		return function (request: Request) {
			if (request.url.startsWith(options.origin)) {
				return new Request(
					options.bypassOrigin + request.url.substring(options.origin.length),
					request
				);
			}
			return request;
		};
	}
}

interface ClientOptions_I {
	url: string;
	transformer?: ArgumentTypes<typeof createTRPCProxyClient>[0]['transformer'];
	batchLinkOptions?: Omit<ArgumentTypes<typeof httpBatchLink>[0], 'url'>;
}

export const browserClientCreate = function <T extends AnyRouter>(options: ClientOptions_I) {
	const { url, batchLinkOptions } = options;

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
