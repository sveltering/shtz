import { initTRPC, TRPCError } from "@trpc/server";
import { resolveHTTPResponse, getHTTPStatusCodeFromError, TRPC_ERROR_CODES_BY_NUMBER, } from "@trpc/server/http";
const TRPC_ERROR_CODES_BY_KEY = Object.fromEntries(Object.entries(TRPC_ERROR_CODES_BY_NUMBER).map(([key, value]) => [value, key]));
export class TRPC {
    options;
    _routes;
    tRPCInner;
    localsKeySet;
    constructor(options) {
        if (typeof window !== "undefined") {
            throw new Error("TRPC should only be used within the server environment.");
        }
        this.localsKeySet = typeof options?.localsKey === "string";
        this.options = {
            path: "/trpc",
            async context() {
                return {};
            },
            localsKey: "TRPC",
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
            .context()
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
    error(message, code) {
        return new TRPCError(typeof message === "string"
            ? {
                code: code || "BAD_REQUEST",
                message,
            }
            : message);
    }
    hookCreate(router) {
        this._routes = router;
        const options = this.options;
        const { path, localsKey, locals, beforeResolve, beforeResponse, context, resolveOptions, } = options;
        const pathTrailingSlash = path + "/";
        const hasLocals = typeof locals === "string" || this.localsKeySet;
        let localsAlways = locals === "always";
        const localsCallable = locals === "callable";
        if (hasLocals && !localsAlways && !localsCallable) {
            localsAlways = true;
        }
        return async function (event) {
            const pipe = {};
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
            let result, dotPath = "";
            const newCookies = [];
            event.cookies.set = new Proxy(event.cookies.set, {
                apply: function (target, thisArg, argumentsList) {
                    target.apply(thisArg, argumentsList);
                    newCookies.push(argumentsList);
                },
            });
            event.cookies.delete = new Proxy(event.cookies.delete, {
                apply: function (target, thisArg, argumentsList) {
                    const cookieName = argumentsList[0];
                    target.apply(thisArg, argumentsList);
                    newCookies.push([
                        cookieName,
                        "",
                        { httpOnly: true, path: "/", maxAge: 0 },
                    ]);
                },
            });
            if (beforeResolve) {
                dotPath = pathName
                    ?.substring?.(path.length + 1)
                    ?.replaceAll?.("/", ".");
                try {
                    const maybeResult = await beforeResolve({
                        dotPath,
                        event,
                        pipe,
                    });
                    if (maybeResult !== undefined) {
                        result = maybeResult;
                    }
                }
                catch (e) {
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
                        headers: request.headers,
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
                    const maybeResult = await beforeResponse({
                        dotPath,
                        event,
                        pipe,
                        result,
                    });
                    if (maybeResult !== undefined) {
                        result = maybeResult;
                    }
                }
                catch (err) {
                    result = TRPCErrorToResponse(err, dotPath);
                }
            }
            if (newCookies.length) {
                if (!result.headers) {
                    result.headers = {};
                }
                const serialize = event.cookies.serialize;
                let setCookie = result.headers?.["Set-Cookie"];
                if (typeof setCookie === "undefined") {
                    setCookie = [];
                }
                else if (typeof setCookie === "string") {
                    setCookie = [setCookie];
                }
                for (let i = 0, iLen = newCookies.length; i < iLen; i++) {
                    setCookie.push(serialize(...newCookies[i]));
                }
                result.headers["Set-Cookie"] = setCookie;
            }
            return new Response(result.body, {
                headers: result.headers,
                status: result.status,
            });
        };
    }
    handleFetchCreate() {
        const options = this.options;
        const { origin, bypassOrigin } = options;
        if (typeof origin !== "string" || typeof bypassOrigin !== "string") {
            throw new Error(`Message from \`handleFetch()\`
No origin or bypass origin has been set, are you sure you need to handle fetch?`);
        }
        return function (request) {
            const url = request.url;
            if (url.startsWith(origin)) {
                return new Request(bypassOrigin + url.substring(origin.length), request);
            }
            return request;
        };
    }
}
export const serverClientCreate = function (t) {
    if (!t?._routes) {
        throw new Error(`You must set your final routes by creating hooks with \`t.hooks(routes)\``);
    }
    return async function (event) {
        return t?._routes?.createCaller?.(await t.context(event, false));
    };
};
function TRPCErrorToResponse(e, dotPath) {
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
