import type { RequestEvent } from '@sveltejs/kit';
import type { HTTPHeaders } from '@trpc/client';
import type { TRPCOpts, TRPCContextFn, TRPCInner, TRPCErrorOpts, pipeType } from './types.js';
import { initTRPC, TRPCError, type AnyRouter } from '@trpc/server';
import {
	resolveHTTPResponse,
	getHTTPStatusCodeFromError,
	TRPC_ERROR_CODES_BY_NUMBER
} from '@trpc/server/http';

const TRPC_ERROR_CODES_BY_KEY = Object.fromEntries(
	Object.entries(TRPC_ERROR_CODES_BY_NUMBER).map(([key, value]) => [value, key])
);

export class TRPC<T extends object> {
	//OPTIONS
	options: TRPCOpts<T> & TRPCContextFn<T>;
	//OTHER
	tRPCInner: TRPCInner<T>;
	_routes?: AnyRouter;

	constructor(options: TRPCOpts<T>) {
		if (typeof window !== 'undefined') {
			throw new Error('new TRPC() should only be used within the server environment.');
		}
		this.options = {
			context: () => ({} as any),
			localsKey: 'TRPC',
			...options
		};
		this.tRPCInner = initTRPC.context<T>().create(this.options?.createOptions || {});
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

	get context() {
		return this?.options?.context;
	}

	error(message: string | TRPCErrorOpts, code?: TRPCErrorOpts['code']) {
		return new TRPCError(
			typeof message === 'string'
				? {
						code: code || 'BAD_REQUEST',
						message
				  }
				: message
		);
	}

	set routes(routes: AnyRouter) {
		this._routes = routes;
	}

	hook(router: AnyRouter) {
		this._routes = router;
		const options = this.options;
		return async function (event: RequestEvent): Promise<false | Response> {
			const pipe: pipeType = {};
			const localsKey = options.localsKey;
			const contextFnConsturctor = options.context.constructor.name;

			const URL = event.url;
			const pathName = URL.pathname;

			if (!pathName.startsWith(options.path)) {
				if (!!options?.locals) {
					return false;
				}
				if (options.locals === 'always') {
					if (contextFnConsturctor === 'AsyncFunction') {
						//@ts-ignore
						event.locals[localsKey] = router.createCaller(await options.context(event, false));
					} else if (contextFnConsturctor === 'Function') {
						//@ts-ignore
						event.locals[localsKey] = router.createCaller(options.context(event, false));
					}
				} //
				else if (options.locals === 'callable') {
					if (contextFnConsturctor === 'AsyncFunction') {
						//@ts-ignore
						event.locals[localsKey] = async () =>
							router.createCaller(await options.context(event, false));
					} else if (contextFnConsturctor === 'Function') {
						//@ts-ignore
						event.locals[localsKey] = () => router.createCaller(options.context(event, false));
					}
				}
				return false;
			}
			const request = event.request as Request;

			let result,
				path: string = '';

			const beforeResolve = options?.beforeResolve || options?.beforeResolveSync || false;
			if (beforeResolve) {
				path = pathName?.substring?.(options.path.length + 1)?.replaceAll?.('/', '.');
				try {
					const maybeResult = await beforeResolve({ path, event, pipe });
					if (maybeResult !== undefined) {
						result = maybeResult;
					}
				} catch (e: any) {
					result = TRPCErrorToResponse(e, path);
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

			if (options?.beforeResponse) {
				path = !!path
					? path
					: pathName?.substring?.(options.path.length + 1)?.replaceAll?.('/', '.');

				try {
					const maybeResult = await options?.beforeResponse({ path, event, pipe, result });
					if (maybeResult !== undefined) {
						result = maybeResult;
					}
				} catch (e: any) {
					result = TRPCErrorToResponse(e, path);
				}
			}

			return new Response(result.body, {
				headers: result.headers as HeadersInit,
				status: result.status
			});
		};
	}

	handleFetch() {
		const options = this.options;
		if (!('bypassOrigin' in options)) {
			throw new Error(
				`Message from \`handleFetch()\`
No origin or bypass origin has been set, are you sure you need to handle fetch?`
			);
		}
		return function (request: Request) {
			if (request.url.startsWith(options.origin as string)) {
				return new Request(
					options.bypassOrigin + request.url.substring((options.origin as string).length),
					request
				);
			}
			return request;
		};
	}
}

export const asyncServerClientCreate = function <R extends AnyRouter>(
	t: TRPC<any>
): (event: RequestEvent) => Promise<ReturnType<R['createCaller']>> {
	if (console?.warn && t.context.constructor.name === 'Function') {
		console.warn(
			`Message from \`asyncServerClientCreate()\`
Your context function is synchronous. Either:
	1. Switch to \`syncServerClientCreate()\` if you have synchronous code in your context function
	OR
	2. Change your context function to async if you have asynchronous code in the context function`
		);
	}

	if (!t?._routes) {
		throw new Error(
			`You must set your final routes.
This is achieved by either
1. Creating hooks with \`t.hooks(routes)\`
OR
2. Setting it on the TRPC object using \`t.routes = routes\``
		);
	}

	return async function (event: RequestEvent): Promise<ReturnType<R['createCaller']>> {
		return t?._routes?.createCaller?.(await t.context(event, false)) as ReturnType<
			R['createCaller']
		>;
	};
};

export const syncServerClientCreate = function <R extends AnyRouter>(
	t: TRPC<any>
): (event: RequestEvent) => ReturnType<R['createCaller']> {
	if (console?.warn && t.context.constructor.name === 'AsyncFunction') {
		console.warn(
			`Message from \`syncServerClientCreate()\`
	Your context function is asynchronous. Either:
		1. Switch to \`asyncServerClientCreate()\` if you have asynchronous code in your context function
		OR
		2. Change your context function to a regular sync function if you have synchronous code in the context function`
		);
	}

	return function (event: RequestEvent): ReturnType<R['createCaller']> {
		return t?._routes?.createCaller(t.context(event, false)) as ReturnType<R['createCaller']>;
	};
};

function TRPCErrorToResponse(e: TRPCError, path: string) {
	const code = e?.code || 'BAD_REQUEST';
	const trpcErrorCode = TRPC_ERROR_CODES_BY_KEY[code];
	const httpStatus = getHTTPStatusCodeFromError(e);
	return {
		body: `[{
			"error":{
				"message":"${e?.message || ''}",
				"code":${trpcErrorCode},
				"data":{
					"code":"${code}",
					"httpStatus":${httpStatus},
					"path":"${path}"
				}
			}
		}]`,
		status: httpStatus,
		headers: {
			'Content-Type': 'application/json'
		}
	};
}
