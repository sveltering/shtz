import { building } from "$app/environment";
import type { RequestEvent, ServerLoadEvent } from "@sveltejs/kit";
import type { HTTPHeaders } from "@trpc/client";
import type {
	HTTPResponse,
	TRPCOpts,
	TRPCInner,
	TRPCErrorOpts,
	CreateContextType,
	KeyValueObject,
	StringLiteral,
	ArgumentTypes,
} from "./types.js";
import { initTRPC, TRPCError, type AnyRouter } from "@trpc/server";
import {
	resolveHTTPResponse,
	getHTTPStatusCodeFromError,
	TRPC_ERROR_CODES_BY_NUMBER,
} from "@trpc/server/http";

const TRPC_ERROR_CODES_BY_KEY = Object.fromEntries(
	Object.entries(TRPC_ERROR_CODES_BY_NUMBER).map(([key, value]) => [value, key])
);
export class TRPC<Ctx extends KeyValueObject, LocalsKey, LocalsType> {
	options: TRPCOpts<Ctx, LocalsKey, LocalsType> & {
		path: string;
		context: CreateContextType<Ctx>;
		localsKey: string;
	};
	_routes?: AnyRouter;
	tRPCInner: TRPCInner<Ctx>;
	localsKeySet: boolean;
	constructor(options?: TRPCOpts<Ctx, LocalsKey, LocalsType>) {
		if (typeof window !== "undefined") {
			throw new Error(
				"TRPC should only be used within the server environment."
			);
		}
		this.localsKeySet = typeof options?.localsKey === "string";
		this.options = {
			path: "/trpc",
			async context() {
				return {} as Promise<Ctx>;
			},
			localsKey: "TRPC" as any as StringLiteral<any>,
			...options,
		};
		const path = this.options.path;
		if (path[0] !== "/") {
			throw new Error(`path "${path}" can not start with "/"`);
		}
		if (path[path.length - 1] === "/") {
			throw new Error(`path "${path}" can not end with trailing "/"`);
		}
		this.tRPCInner = initTRPC
			.context<Ctx>()
			.create(this.options?.createOptions || {});
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
	error(message: string, code?: TRPCErrorOpts["code"]): TRPCError;
	error(
		message: string | TRPCErrorOpts,
		code?: TRPCErrorOpts["code"]
	): TRPCError {
		return new TRPCError(
			typeof message === "string"
				? {
						code: code || "BAD_REQUEST",
						message,
				  }
				: message
		);
	}

	issue(
		message: string,
		path: string | string[] = [],
		code: string = "custom"
	) {
		return this.error(
			JSON.stringify([
				{ message, path: typeof path === "string" ? [path] : path, code },
			])
		);
	}

	issues(
		issues: { message: string; path?: string | string[]; code?: string }[]
	) {
		issues = issues.map(({ message, path, code }) => ({
			message,
			path: typeof path === "string" ? [path] : path || [],
			code: code || "custom",
		}));
		return this.error(JSON.stringify(issues));
	}

	hookCreate(router: AnyRouter) {
		this._routes = router;
		const options = this.options;

		const {
			path,
			localsKey,
			locals,
			beforeResolve,
			beforeResponse,
			context,
			resolveOptions,
		} = options;

		const pathTrailingSlash = path + "/";
		const hasLocals: boolean = typeof locals === "string" || this.localsKeySet;
		let localsAlways: boolean = locals === "always";
		const localsCallable: boolean = locals === "callable";

		if (hasLocals && !localsAlways && !localsCallable) {
			localsAlways = true;
		}

		return async function (event: RequestEvent): Promise<false | Response> {
			const pipe: KeyValueObject = {};

			const URL = event.url;
			const pathName = URL.pathname;

			if (!pathName.startsWith(pathTrailingSlash)) {
				if (!hasLocals) {
					return false;
				}
				if (localsAlways) {
					//@ts-ignore
					event.locals[localsKey] = router.createCaller(
						await context(event, false)
					);
				} //
				else if (localsCallable) {
					//@ts-ignore
					event.locals[localsKey] = async () =>
						router.createCaller(await context(event, false));
				}
				return false;
			}

			let response: HTTPResponse | undefined,
				dotPath: string = "";

			// const cookiesBefore = event.cookies.getAll();

			type CookieSetArgs = ArgumentTypes<typeof event.cookies.set>;
			type CookieDeleteArgs = ArgumentTypes<typeof event.cookies.delete>;
			const newCookies: CookieSetArgs[] = [];

			event.cookies.set = new Proxy(event.cookies.set, {
				apply: function (target, thisArg, argumentsList: CookieSetArgs) {
					target.apply(thisArg, argumentsList);
					newCookies.push(argumentsList);
				},
			});

			event.cookies.delete = new Proxy(event.cookies.delete, {
				apply: function (target, thisArg, argumentsList: CookieDeleteArgs) {
					const cookieName = argumentsList[0];
					target.apply(thisArg, argumentsList);
					newCookies.push([
						cookieName,
						"",
						{ ...argumentsList?.[1], maxAge: 0 },
					]);
				},
			});

			if (beforeResolve) {
				dotPath = pathName
					?.substring?.(path.length + 1)
					?.replaceAll?.("/", ".");
				try {
					const maybeResponse = await beforeResolve({
						dotPath,
						event,
						pipe,
					});
					if (maybeResponse !== undefined) {
						response = maybeResponse;
					}
				} catch (e: any) {
					response = TRPCErrorToResponse(e, dotPath);
				}
			}

			if (!response) {
				const request = event.request;
				response = await resolveHTTPResponse({
					createContext: async () => await context(event, pipe),
					path: pathName.substring(path.length + 1),
					req: {
						body: await request.text(),
						headers: request.headers as unknown as HTTPHeaders,
						method: request.method,
						query: URL.searchParams,
					},
					router,
					...resolveOptions,
				});
			}

			if (beforeResponse) {
				dotPath = !!dotPath
					? dotPath
					: pathName?.substring?.(path.length + 1)?.replaceAll?.("/", ".");
				try {
					const maybeResponse = await beforeResponse({
						dotPath,
						event,
						pipe,
						response,
					});
					if (maybeResponse !== undefined) {
						response = maybeResponse;
					}
				} catch (err: any) {
					response = TRPCErrorToResponse(err, dotPath);
				}
			}

			if (newCookies.length) {
				if (!response.headers) {
					response.headers = {};
				}
				const serialize = event.cookies.serialize;
				let setCookie = response.headers?.["Set-Cookie"] as string[];
				if (typeof setCookie === "undefined") {
					setCookie = [];
				} else if (typeof setCookie === "string") {
					setCookie = [setCookie];
				}
				for (let i = 0, iLen = newCookies.length; i < iLen; i++) {
					setCookie.push(serialize(...newCookies[i]));
				}
				response.headers["Set-Cookie"] = setCookie;
			}

			return new Response(response.body, {
				headers: response.headers as HeadersInit,
				status: response.status,
			});
		};
	}

	handleFetchCreate() {
		const options = this.options;

		const { origin, bypassOrigin } = options;

		if (typeof origin !== "string" || typeof bypassOrigin !== "string") {
			throw new Error(
				`Message from \`handleFetch()\`
No origin or bypass origin has been set, are you sure you need to handle fetch?`
			);
		}

		return function (request: Request) {
			const url = request.url;
			if (url.startsWith(origin)) {
				return new Request(
					bypassOrigin + url.substring(origin.length),
					request
				);
			}
			return request;
		};
	}
}

type serverClientCreateR<R extends AnyRouter> = (
	event: RequestEvent | ServerLoadEvent
) => Promise<ReturnType<R["createCaller"]>>;

export const serverClientCreate = function <R extends AnyRouter>(
	t: TRPC<any, any, any>
): serverClientCreateR<R> {
	if (building) {
		return undefined as any as serverClientCreateR<R>;
	}
	if (!t?._routes) {
		throw new Error(
			`You must set your final routes by creating hooks with \`t.hooks(routes)\``
		);
	}
	return async function (
		event: RequestEvent | ServerLoadEvent
	): Promise<ReturnType<R["createCaller"]>> {
		return t?._routes?.createCaller?.(
			await t.context(event, false)
		) as ReturnType<R["createCaller"]>;
	};
};

function TRPCErrorToResponse(e: TRPCError, dotPath: string) {
	const code = e?.code || "BAD_REQUEST";
	const trpcErrorCode = TRPC_ERROR_CODES_BY_KEY[code];
	const httpStatus = getHTTPStatusCodeFromError(e);
	return {
		body: `[{
			"error":{
				"message":"${e?.message || ""}",
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
			"Content-Type": "application/json",
		},
	};
}
