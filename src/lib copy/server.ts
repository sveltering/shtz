import type { RequestEvent } from '@sveltejs/kit';
import type { HTTPHeaders } from '@trpc/client';
import type {
	HTTPResponse,
	TRPCOpts,
	TRPCInner,
	TRPCErrorOpts,
	createContextType,
	KeyValue,
	StringLiteral
} from './types.js';
import { initTRPC, TRPCError, type AnyRouter } from '@trpc/server';
import {
	resolveHTTPResponse,
	getHTTPStatusCodeFromError,
	TRPC_ERROR_CODES_BY_NUMBER
} from '@trpc/server/http';

const TRPC_ERROR_CODES_BY_KEY = Object.fromEntries(
	Object.entries(TRPC_ERROR_CODES_BY_NUMBER).map(([key, value]) => [value, key])
);
export class TRPC<Ctx extends KeyValue, LocalsKey, LocalsType> {
	options: TRPCOpts<Ctx, LocalsKey, LocalsType> & {
		path: string;
		context: createContextType<Ctx>;
		localsKey: string;
	};
	_routes?: AnyRouter;
	tRPCInner: TRPCInner<Ctx>;
	localsKeySet: boolean;
	constructor(options: TRPCOpts<Ctx, LocalsKey, LocalsType>) {
		if (typeof window !== 'undefined') {
			throw new Error('TRPC should only be used within the server environment.');
		}
		this.localsKeySet = typeof options?.localsKey === 'string';
		this.options = {
			path: '/trpc',
			async context() {
				return {} as Promise<Ctx>;
			},
			localsKey: 'TRPC' as any as StringLiteral<any>,
			...options
		};
		const path = this.options.path;
		if (path[0] !== '/') {
			throw new Error(`path "${path}" can not start with "/"`);
		}
		if (path[path.length - 1] === '/') {
			throw new Error(`path "${path}" can not end with trailing "/"`);
		}
		this.tRPCInner = initTRPC.context<Ctx>().create(this.options?.createOptions || {});
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

	error(message: TRPCErrorOpts): TRPCError;
	error(message: string, code?: TRPCErrorOpts['code']): TRPCError;
	error(message: string | TRPCErrorOpts, code?: TRPCErrorOpts['code']): TRPCError {
		return new TRPCError(
			typeof message === 'string'
				? {
						code: code || 'BAD_REQUEST',
						message
				  }
				: message
		);
	}

	hookCreate(router: AnyRouter) {
		this._routes = router;
		const options = this.options;

		const { path, localsKey, locals, beforeResolve, beforeResponse, context, resolveOptions } =
			options;

		const pathTrailingSlash = path + '/';
		const hasLocals: boolean = typeof locals === 'string' || this.localsKeySet;
		let localsAlways: boolean = locals === 'always';
		const localsCallable: boolean = locals === 'callable';

		if (hasLocals && !localsAlways && !localsCallable) {
			localsAlways = true;
		}

		return async function (event: RequestEvent): Promise<false | Response> {
			const pipe: KeyValue = {};

			const URL = event.url;
			const pathName = URL.pathname;

			if (!pathName.startsWith(pathTrailingSlash)) {
				if (!hasLocals) {
					return false;
				}
				if (localsAlways) {
					//@ts-ignore
					event.locals[localsKey] = router.createCaller(await context(event, false));
				} //
				else if (localsCallable) {
					//@ts-ignore
					event.locals[localsKey] = async () => router.createCaller(await context(event, false));
				}
				return false;
			}

			let result: HTTPResponse | undefined,
				dotPath: string = '';

			if (beforeResolve) {
				dotPath = pathName?.substring?.(path.length + 1)?.replaceAll?.('/', '.');
				try {
					const maybeResult = await beforeResolve({ dotPath, event, pipe });
					if (maybeResult !== undefined) {
						result = maybeResult;
					}
				} catch (e: any) {
					result = TRPCErrorToResponse(e, dotPath);
				}
			}

			if (!result) {
				const request = event.request;
				result = await resolveHTTPResponse({
					createContext: async () => await context(event, pipe),
					path: pathName.substring(path.length + 1),
					req: {
						body: await request.text(),
						headers: request.headers as unknown as HTTPHeaders,
						method: request.method,
						query: URL.searchParams
					},
					router,
					...resolveOptions
				});
			}

			if (beforeResponse) {
				dotPath = !!dotPath
					? dotPath
					: pathName?.substring?.(path.length + 1)?.replaceAll?.('/', '.');
				try {
					const maybeResult = await beforeResponse({ dotPath, event, pipe, result });
					if (maybeResult !== undefined) {
						result = maybeResult;
					}
				} catch (e: any) {
					result = TRPCErrorToResponse(e, dotPath);
				}
			}

			return new Response(result.body, {
				headers: result.headers as HeadersInit,
				status: result.status
			});
		};
	}

	handleFetchCreate() {
		const options = this.options;

		const { origin, bypassOrigin } = options;

		if (typeof origin !== 'string' || typeof bypassOrigin !== 'string') {
			throw new Error(
				`Message from \`handleFetch()\`
No origin or bypass origin has been set, are you sure you need to handle fetch?`
			);
		}

		return function (request: Request) {
			const url = request.url;
			if (url.startsWith(origin)) {
				return new Request(bypassOrigin + url.substring(origin.length), request);
			}
			return request;
		};
	}
}

export const serverClientCreate = function <R extends AnyRouter>(
	t: TRPC<any, any, any>
): (event: RequestEvent) => Promise<ReturnType<R['createCaller']>> {
	if (!t?._routes) {
		throw new Error(`You must set your final routes by creating hooks with \`t.hooks(routes)\``);
	}
	return async function (event: RequestEvent): Promise<ReturnType<R['createCaller']>> {
		return t?._routes?.createCaller?.(await t.context(event, false)) as ReturnType<
			R['createCaller']
		>;
	};
};

function TRPCErrorToResponse(e: TRPCError, dotPath: string) {
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
					"path":"${dotPath}"
				}
			}
		}]`,
		status: httpStatus,
		headers: {
			'Content-Type': 'application/json'
		}
	};
}