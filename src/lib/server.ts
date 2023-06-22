// Reexport your entry components here
import type { RequestEvent } from '@sveltejs/kit';
import { initTRPC, type AnyRouter } from '@trpc/server';
import { resolveHTTPResponse } from '@trpc/server/http';
import type { HTTPResponse } from '@trpc/server/dist/http/internals/types';
import type { HTTPHeaders } from '@trpc/client';
import { parse as parseURL } from 'url';

type keyValue = { [key: string]: any };
type ArgumentTypes<F extends Function> = F extends (...args: infer A) => any ? A : never;
type SyncReturnType<T extends CallableFunction> = T extends (...args: any) => infer R ? R : any;
type createContextFn_T<T> = (event: RequestEvent, pipe: keyValue) => Promise<T> | T;

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
			const pipe: keyValue = {};
			const localsKey = options.localsKey;
			const contextFnConsturctor = options.context.constructor.name;

			const URL = event.url;
			const pathName = URL.pathname;
			if (!pathName.startsWith(options.path)) {
				if (options.locals === 'always') {
					if (contextFnConsturctor === 'AsyncFunction') {
						//@ts-ignore
						event.locals[localsKey] = router.createCaller(await options.context(event, pipe));
					} else if (contextFnConsturctor === 'Function') {
						//@ts-ignore
						event.locals[localsKey] = router.createCaller(options.context(event, pipe));
					}
				} //
				else if (options.locals === 'callable') {
					if (contextFnConsturctor === 'AsyncFunction') {
						//@ts-ignore
						event.locals[localsKey] = async () =>
							router.createCaller(await options.context(event, pipe));
					} else if (contextFnConsturctor === 'Function') {
						//@ts-ignore
						event.locals[localsKey] = () => router.createCaller(options.context(event, pipe));
					}
				}
				return false;
			}
			const request = event.request as Request;

			let result;

			if (options?.beforeResolve) {
				await options.beforeResolve?.(event, pipe);
			}

			if (options?.resolveError) {
				const errorMessage = await options.resolveError?.(event, pipe);
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
					createContext: async () => await options.context(event, pipe),
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
				await options?.beforeResponse(event, pipe, result);
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
