import { initTRPC, TRPCError } from '@trpc/server';
import { resolveHTTPResponse } from '@trpc/server/http';
import { parse as parseURL } from 'url';
export class TRPC {
    //OPTIONS
    options;
    //OTHER
    tRPCInner;
    _routes;
    constructor(options) {
        if (typeof window !== 'undefined') {
            throw new Error('new TRPC() should only be used within the server environment.');
        }
        this.options = {
            context: () => ({}),
            localsKey: 'TRPC',
            ...options
        };
        this.tRPCInner = initTRPC.context().create(this.options?.createOptions || {});
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
        return new TRPCError(typeof message === 'string'
            ? {
                code: code || 'BAD_REQUEST',
                message
            }
            : message);
    }
    set routes(routes) {
        this._routes = routes;
    }
    hook(router) {
        this._routes = router;
        const options = this.options;
        return async function (event) {
            const pipe = {};
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
                    }
                    else if (contextFnConsturctor === 'Function') {
                        //@ts-ignore
                        event.locals[localsKey] = router.createCaller(options.context(event, false));
                    }
                } //
                else if (options.locals === 'callable') {
                    if (contextFnConsturctor === 'AsyncFunction') {
                        //@ts-ignore
                        event.locals[localsKey] = async () => router.createCaller(await options.context(event, false));
                    }
                    else if (contextFnConsturctor === 'Function') {
                        //@ts-ignore
                        event.locals[localsKey] = () => router.createCaller(options.context(event, false));
                    }
                }
                return false;
            }
            const request = event.request;
            let result;
            if (options?.beforeResolve) {
                await options.beforeResolve?.(event, pipe);
            }
            if (options?.resolveError) {
                const errorMessage = await options.resolveError?.(event, pipe);
                if (errorMessage) {
                    const path = parseURL(request.url)
                        .pathname?.substring?.(options.path.length + 1)
                        ?.replaceAll?.('/', '.');
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
                        headers: request.headers,
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
                headers: result.headers,
                status: result.status
            });
        };
    }
    handleFetch() {
        const options = this.options;
        if (!('bypassOrigin' in options)) {
            throw new Error(`Message from \`handleFetch()\`
No origin or bypass origin has been set, are you sure you need to handle fetch?`);
        }
        return function (request) {
            if (request.url.startsWith(options.origin)) {
                return new Request(options.bypassOrigin + request.url.substring(options.origin.length), request);
            }
            return request;
        };
    }
}
export const asyncServerClientCreate = function (t) {
    if (console?.warn && t.context.constructor.name === 'Function') {
        console.warn(`Message from \`asyncServerClientCreate()\`
Your context function is synchronous. Either:
	1. Switch to \`syncServerClientCreate()\` if you have synchronous code in your context function
	OR
	2. Change your context function to async if you have asynchronous code in the context function`);
    }
    if (!t?._routes) {
        throw new Error(`You must set your final routes.
This is achieved by either
1. Creating hooks with \`t.hooks(routes)\`
OR
2. Setting it on the TRPC object using \`t.routes = routes\``);
    }
    return async function (event) {
        return t?._routes?.createCaller?.(await t.context(event, false));
    };
};
export const syncServerClientCreate = function (t) {
    if (console?.warn && t.context.constructor.name === 'AsyncFunction') {
        console.warn(`Message from \`syncServerClientCreate()\`
	Your context function is asynchronous. Either:
		1. Switch to \`asyncServerClientCreate()\` if you have asynchronous code in your context function
		OR
		2. Change your context function to a regular sync function if you have synchronous code in the context function`);
    }
    return function (event) {
        return t?._routes?.createCaller(t.context(event, false));
    };
};
